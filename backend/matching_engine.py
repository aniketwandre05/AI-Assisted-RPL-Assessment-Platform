import re
import json
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.database import db
from backend.models.qualification import Qualification, PerformanceCriterion, ToolAndEquipment
from backend.models.worker_profile import WorkerProfile, QualificationMatch

class MatchingEngine:
    """
    Modular, Explainable Skill Matching Engine for Recognition of Prior Learning (RPL).
    Combines:
    1. Title & Trade lexical overlap
    2. Skill & Tool inventory matching against official criteria and equipment
    3. TF-IDF semantic text similarity
    Provides transparent criteria citations and returns explicit no-match outcomes.
    """

    MATCH_THRESHOLD_HIGH = 50.0
    MATCH_THRESHOLD_MEDIUM = 30.0
    MATCH_THRESHOLD_MIN = 15.0

    STOPWORDS = {
        "and", "the", "with", "for", "in", "of", "to", "a", "an", "on", "at", "by", "is",
        "able", "ability", "using", "use", "work", "experience", "basic", "knowledge", "years",
        "good", "well", "performing", "understanding", "different", "etc", "junior", "senior"
    }

    @staticmethod
    def extract_skill_terms(text: str) -> List[str]:
        if not text:
            return []
        
        tokens = re.findall(r'[a-zA-Z0-9#\+\.\-]+', text)
        cleaned = []
        for t in tokens:
            t_clean = t.strip('.,;:-_').lower()
            if len(t_clean) >= 2 and t_clean not in MatchingEngine.STOPWORDS:
                cleaned.append(t_clean)
        
        phrases = []
        text_lower = text.lower()
        known_phrases = [
            "full stack", "web developer", "software developer", "spring boot", "rest api", "mysql", "docker",
            "kubernetes", "angular", "c++", "python", "solar pv", "solar panel",
            "distribution board", "multimeter", "circuit breaker", "wire stripper"
        ]
        for kp in known_phrases:
            if kp in text_lower:
                phrases.append(kp)

        combined = list(dict.fromkeys(phrases + cleaned))
        return combined[:20]

    @classmethod
    def match_worker_profile(
        cls,
        profile: WorkerProfile,
        top_k: int = 5,
        min_threshold: float = MATCH_THRESHOLD_MIN
    ) -> Dict[str, Any]:
        qualifications = Qualification.query.all()
        if not qualifications:
            return {
                "is_match_found": False,
                "matches": [],
                "reason": "No qualifications are currently registered in the database."
            }

        tasks = profile.get_daily_tasks()
        tools = profile.get_tools_used()
        skills = profile.get_skills_declared()
        
        worker_text = " ".join([
            profile.occupation_title,
            " ".join(tasks),
            " ".join(tools),
            " ".join(skills),
            profile.informal_training_desc or ""
        ]).strip()

        if not worker_text or len(worker_text) < 5:
            return {
                "is_match_found": False,
                "matches": [],
                "reason": "Worker self-declaration is too brief to identify trade competencies."
            }

        w_title_words = set(re.findall(r'[a-zA-Z0-9]+', profile.occupation_title.lower())) - cls.STOPWORDS
        worker_skills_lower = [s.lower() for s in (skills + tools + tasks)]

        # TF-IDF corpus
        corpus = [worker_text]
        qual_texts = []
        for q in qualifications:
            q_text_parts = [
                q.title,
                q.trade,
                q.sector,
                q.description or ""
            ]
            for nos in q.occupational_standards:
                q_text_parts.append(nos.title)
                for pc in nos.performance_criteria:
                    q_text_parts.append(pc.criterion_text)
            for t in q.tools_and_equipment:
                q_text_parts.append(t.tool_name)
            
            doc_str = " ".join(q_text_parts)
            qual_texts.append(doc_str)
            corpus.append(doc_str)

        try:
            vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
            mat = vec.fit_transform(corpus)
            cos_scores = cosine_similarity(mat[0:1], mat[1:]).flatten()
        except Exception:
            cos_scores = np.zeros(len(qualifications))

        # Clear existing suggestions
        QualificationMatch.query.filter_by(worker_profile_id=profile.id).delete()

        evaluated_matches = []

        for idx, qual in enumerate(qualifications):
            q_corpus_lower = qual_texts[idx].lower()
            q_title_words = set(re.findall(r'[a-zA-Z0-9]+', f"{qual.title} {qual.trade}".lower())) - cls.STOPWORDS

            # 1. Title/Trade Overlap Score
            title_overlap = len(w_title_words & q_title_words)
            title_score = (title_overlap / max(1, len(w_title_words))) if w_title_words else 0.0

            # 2. Skill/Tool Overlap Score
            matched_terms = [s for s in worker_skills_lower if s in q_corpus_lower]
            skill_score = (len(matched_terms) / max(1, len(worker_skills_lower))) if worker_skills_lower else 0.0

            # 3. TF-IDF Score
            tfidf_score = min(1.0, float(cos_scores[idx]) * 2.5)

            # Combined hybrid score (0 to 100%)
            # If both title and skills have zero overlap and tfidf is negligible, clamp to 0
            if title_overlap == 0 and len(matched_terms) == 0 and tfidf_score < 0.10:
                final_score = 0.0
            else:
                final_score = round(min(100.0, (title_score * 0.40 + skill_score * 0.35 + tfidf_score * 0.25) * 100.0), 1)

            if final_score < min_threshold:
                continue

            # Identify specific matched criteria
            matched_criteria_citations = []
            for nos in qual.occupational_standards:
                for pc in nos.performance_criteria:
                    pc_lower = pc.criterion_text.lower()
                    overlap = [w for w in (skills + tools + list(w_title_words)) if w.lower() in pc_lower]
                    if overlap:
                        matched_criteria_citations.append({
                            "criterion_code": pc.criterion_code,
                            "nos_code": nos.nos_code,
                            "criterion_text": pc.criterion_text,
                            "matching_terms": overlap[:3]
                        })

            # Identify matched tools
            matched_tools_list = []
            for t in qual.tools_and_equipment:
                t_lower = t.tool_name.lower()
                tool_overlap = [w for w in tools if w.lower() in t_lower or t_lower in w.lower()]
                if tool_overlap:
                    matched_tools_list.append(t.tool_name)

            if final_score >= cls.MATCH_THRESHOLD_HIGH:
                confidence = "HIGH"
            elif final_score >= cls.MATCH_THRESHOLD_MEDIUM:
                confidence = "MEDIUM"
            else:
                confidence = "LOW"

            rationale = {
                "confidence": confidence,
                "score_percentage": final_score,
                "matched_skills": matched_terms[:6],
                "matched_tools": matched_tools_list[:4],
                "matched_criteria": matched_criteria_citations[:5],
                "reason_summary": (
                    f"Identified {final_score}% alignment between declared role '{profile.occupation_title}' "
                    f"and official NSQF Level {qual.nsqf_level} standard '{qual.title}' "
                    f"({len(matched_criteria_citations)} performance criteria cited)."
                )
            }

            match_record = QualificationMatch(
                worker_profile_id=profile.id,
                qualification_id=qual.id,
                match_score=final_score,
                match_rationale=json.dumps(rationale),
                status="suggested"
            )
            db.session.add(match_record)

            evaluated_matches.append({
                "qualification_id": qual.id,
                "title": qual.title,
                "nqr_code": qual.nqr_code,
                "sector": qual.sector,
                "trade": qual.trade,
                "nsqf_level": qual.nsqf_level,
                "is_synthetic": qual.is_synthetic,
                "match_score": final_score,
                "confidence": confidence,
                "rationale": rationale
            })

        db.session.commit()

        # Sort by score descending
        evaluated_matches.sort(key=lambda m: m["match_score"], reverse=True)
        top_matches = evaluated_matches[:top_k]

        if not top_matches:
            return {
                "is_match_found": False,
                "matches": [],
                "reason": (
                    f"No official NSQF qualification achieved the minimum confidence threshold ({min_threshold}%). "
                    "Please review your task descriptions, add specific tools used, or speak with an RPL counselor."
                )
            }

        return {
            "is_match_found": True,
            "total_matches": len(top_matches),
            "top_match": top_matches[0],
            "matches": top_matches
        }
