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

    INDIC_VOCATIONAL_MAP = {
        # IT & Development (Hindi / Marathi)
        "वेब डेवलपर": "web developer full stack frontend backend",
        "वेब डेव्हलपर": "web developer full stack frontend backend",
        "सॉफ्टवेयर": "software developer programming",
        "सॉफ्टवेअर": "software developer programming",
        "कोडिंग": "coding programming software",
        "डेटाबेस": "database mysql sql queries",
        
        # Electrical & Electronics
        "इलेक्ट्रीशियन": "electrician electrical wiring circuit",
        "इलेक्ट्रिशियन": "electrician electrical wiring circuit",
        "वायरिंग": "wiring electrical cable circuit",
        "मीटर": "multimeter meter testing voltage",
        "मल्टीमीटर": "multimeter digital multimeter testing voltage",
        "सर्किट": "circuit breaker mcb switchboard",
        "विद्युत": "electrical electrician wiring",
        "मोटर": "motor pump rewinding electrical",
        
        # Solar & Green Energy
        "सोलर": "solar pv panel rooftop installation",
        "सौर ऊर्जा": "solar pv panel installation green energy",
        "सौर पॅनेल": "solar pv panel rooftop installation",
        "सोलर पैनल": "solar pv panel rooftop installation",
        
        # Construction, Plumbing & Mechanical Trades
        "प्लंबर": "plumber plumbing piping sanitary fittings",
        "प्लंबिंग": "plumbing pipes repair water connection",
        "नळ": "plumbing pipe tap water fitting",
        "नल": "plumbing pipe tap water fitting",
        "वेल्डर": "welder welding metal fabrication arc gas",
        "वेल्डिंग": "welding metal fabrication arc",
        "कारपेंटर": "carpenter woodwork furniture joinery",
        "सुतार": "carpenter woodwork furniture joinery",
        "मेसन": "mason masonry brickwork plastering tile",
        "गवंडी": "mason masonry construction bricklayer",
        "बांधकाम": "construction masonry building",
    }

    @classmethod
    def normalize_indic_text(cls, text: str) -> str:
        """
        Translates and expands Indic (Hindi / Marathi) vocational terms into normalized
        English NSQF domain terminology to enable zero-barrier grassroots matching.
        """
        if not text:
            return ""
        expanded = [text]
        for indic_term, en_mapping in cls.INDIC_VOCATIONAL_MAP.items():
            if indic_term in text:
                expanded.append(en_mapping)
        return " ".join(expanded)

    @classmethod
    def extract_skill_terms(cls, text: str) -> List[str]:
        if not text:
            return []
        
        tokens = re.findall(r'[\w#\+\.\-]+', text, re.UNICODE)
        cleaned = []
        for t in tokens:
            t_clean = t.strip('.,;:-_').lower()
            if len(t_clean) >= 2 and t_clean not in cls.STOPWORDS:
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

        # Append normalized Indic keywords
        for indic_term, en_mapping in cls.INDIC_VOCATIONAL_MAP.items():
            if indic_term in text:
                phrases.extend(en_mapping.split()[:2])

        combined = list(dict.fromkeys(phrases + cleaned))
        return combined[:20]

    @staticmethod
    def evaluate_candidate_eligibility(
        profile: WorkerProfile,
        qual: Any
    ) -> Dict[str, Any]:
        """
        Evaluates candidate eligibility against official NSQF / NCVET Recognition of Prior Learning
        Entry Requirements Matrix.
        RPL principle: Relevant informal work experience compensates for lack of formal educational qualifications.
        """
        if isinstance(qual, dict):
            level = qual.get("nsqf_level") or 4.0
        else:
            level = getattr(qual, "nsqf_level", 4.0) or 4.0
        exp = profile.experience_years or 0.0
        edu = (profile.education_level or "").lower()

        # Minimum required baseline experience by NSQF level under RPL framework
        if level <= 3.0:
            min_exp_required = 1.0
        elif level <= 4.0:
            min_exp_required = 1.5
        elif level <= 5.0:
            min_exp_required = 2.0
        else:
            min_exp_required = 3.0

        # Education evaluation
        has_higher_edu = any(k in edu for k in ["diploma", "graduate", "degree", "bachelor", "master", "12th"])

        if exp >= min_exp_required:
            status = "ELIGIBLE"
            summary = f"Candidate possesses {exp} years of trade experience, fulfilling the {min_exp_required} yr minimum required for NSQF Level {level} RPL assessment."
        elif exp >= (min_exp_required * 0.6) and has_higher_edu:
            status = "PROVISIONALLY_ELIGIBLE"
            summary = f"Candidate has {exp} years experience backed by formal educational background ({profile.education_level}); provisionally eligible subject to 12-hour orientation."
        elif exp >= (min_exp_required * 0.6):
            status = "PROVISIONALLY_ELIGIBLE"
            summary = f"Candidate has {exp} years experience (benchmark: {min_exp_required} yrs); eligible with mandatory 12-hour orientation & bridge support."
        else:
            status = "INSUFFICIENT_EXPERIENCE"
            summary = f"Candidate has {exp} years experience, which is below the minimum threshold ({min_exp_required} yrs) for NSQF Level {level} RPL. Short-term training (STT) recommended instead."

        return {
            "eligibility_status": status,
            "target_nsqf_level": level,
            "declared_experience_years": exp,
            "minimum_experience_required_years": min_exp_required,
            "declared_education": profile.education_level or "Not specified",
            "is_experience_sufficient": exp >= min_exp_required,
            "summary_assessment": summary,
            "ncvet_rule_reference": f"NCVET RPL Guidelines Entry Criteria for NSQF Level {level}"
        }

    _cached_index: Optional[Dict[str, Any]] = None

    @classmethod
    def invalidate_cache(cls):
        cls._cached_index = None

    @classmethod
    def _get_or_build_index(cls):
        from sqlalchemy.orm import selectinload
        from backend.models.qualification import NationalOccupationalStandard
        
        current_count = Qualification.query.count()
        first_row = db.session.query(Qualification.id).first()
        current_sig = (current_count, first_row[0] if first_row else None)
        if cls._cached_index is not None and cls._cached_index.get("sig") == current_sig:
            return cls._cached_index

        qualifications = Qualification.query.options(
            selectinload(Qualification.occupational_standards).selectinload(NationalOccupationalStandard.performance_criteria),
            selectinload(Qualification.tools_and_equipment)
        ).all()

        qual_metadata = []
        qual_texts = []
        for q in qualifications:
            q_text_parts = [q.title, q.trade, q.sector, q.description or ""]
            criteria_items = []
            for nos in q.occupational_standards:
                q_text_parts.append(nos.title)
                for pc in nos.performance_criteria:
                    q_text_parts.append(pc.criterion_text)
                    criteria_items.append({
                        "criterion_code": pc.criterion_code,
                        "nos_code": nos.nos_code,
                        "criterion_text": pc.criterion_text,
                    })
            tools_items = []
            for t in q.tools_and_equipment:
                q_text_parts.append(t.tool_name)
                tools_items.append(t.tool_name)

            doc_str = " ".join(q_text_parts)
            qual_texts.append(doc_str)
            title_words = set(re.findall(r'[a-zA-Z0-9]+', f"{q.title} {q.trade}".lower())) - cls.STOPWORDS
            
            qual_metadata.append({
                "id": q.id,
                "title": q.title,
                "nqr_code": q.nqr_code,
                "sector": q.sector,
                "trade": q.trade,
                "nsqf_level": q.nsqf_level,
                "is_synthetic": q.is_synthetic,
                "corpus_lower": doc_str.lower(),
                "title_words": title_words,
                "criteria_items": criteria_items,
                "tools_items": tools_items,
            })

        vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
        tfidf_mat = vec.fit_transform(qual_texts) if qual_texts else None

        cls._cached_index = {
            "sig": current_sig,
            "metadata": qual_metadata,
            "vectorizer": vec,
            "tfidf_matrix": tfidf_mat,
        }
        return cls._cached_index

    @classmethod
    def match_worker_profile(
        cls,
        profile: WorkerProfile,
        top_k: int = 5,
        min_threshold: float = MATCH_THRESHOLD_MIN
    ) -> Dict[str, Any]:
        index = cls._get_or_build_index()
        qual_metadata = index["metadata"]
        vec = index["vectorizer"]
        tfidf_mat = index["tfidf_matrix"]

        if not qual_metadata:
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

        normalized_worker_text = cls.normalize_indic_text(worker_text)
        w_title_words = set(re.findall(r'[\w]+', cls.normalize_indic_text(profile.occupation_title).lower(), re.UNICODE)) - cls.STOPWORDS
        worker_skills_lower = [s.lower() for s in (skills + tools + tasks)]
        for s in list(worker_skills_lower):
            mapped = cls.normalize_indic_text(s)
            if mapped != s:
                worker_skills_lower.extend(mapped.lower().split())

        try:
            worker_vec = vec.transform([normalized_worker_text])
            cos_scores = cosine_similarity(worker_vec, tfidf_mat).flatten()
        except Exception:
            cos_scores = np.zeros(len(qual_metadata))

        # Clear existing suggestions
        QualificationMatch.query.filter_by(worker_profile_id=profile.id).delete()

        evaluated_matches = []

        for idx, item in enumerate(qual_metadata):
            q_corpus_lower = item["corpus_lower"]
            q_title_words = item["title_words"]

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

            # Identify specific matched criteria from cached items
            matched_criteria_citations = []
            for crit in item["criteria_items"]:
                pc_lower = crit["criterion_text"].lower()
                overlap = [w for w in (skills + tools + list(w_title_words)) if w.lower() in pc_lower]
                if overlap:
                    matched_criteria_citations.append({
                        "criterion_code": crit["criterion_code"],
                        "nos_code": crit["nos_code"],
                        "criterion_text": crit["criterion_text"],
                        "matching_terms": overlap[:3]
                    })

            # Identify matched tools from cached items
            matched_tools_list = []
            for tool_name in item["tools_items"]:
                t_lower = tool_name.lower()
                tool_overlap = [w for w in tools if w.lower() in t_lower or t_lower in w.lower()]
                if tool_overlap:
                    matched_tools_list.append(tool_name)

            if final_score >= cls.MATCH_THRESHOLD_HIGH:
                confidence = "HIGH"
            elif final_score >= cls.MATCH_THRESHOLD_MEDIUM:
                confidence = "MEDIUM"
            else:
                confidence = "LOW"

            eligibility = cls.evaluate_candidate_eligibility(profile, item)

            rationale = {
                "confidence": confidence,
                "score_percentage": final_score,
                "matched_skills": matched_terms[:6],
                "matched_tools": matched_tools_list[:4],
                "matched_criteria": matched_criteria_citations[:5],
                "eligibility": eligibility,
                "reason_summary": (
                    f"Identified {final_score}% alignment between declared role '{profile.occupation_title}' "
                    f"and official NSQF Level {item['nsqf_level']} standard '{item['title']}' "
                    f"({len(matched_criteria_citations)} performance criteria cited). "
                    f"Eligibility Status: {eligibility['eligibility_status']}."
                )
            }

            match_record = QualificationMatch(
                worker_profile_id=profile.id,
                qualification_id=item["id"],
                match_score=final_score,
                match_rationale=json.dumps(rationale),
                status="suggested"
            )
            db.session.add(match_record)

            evaluated_matches.append({
                "qualification_id": item["id"],
                "title": item["title"],
                "nqr_code": item["nqr_code"],
                "sector": item["sector"],
                "trade": item["trade"],
                "nsqf_level": item["nsqf_level"],
                "is_synthetic": item["is_synthetic"],
                "match_score": final_score,
                "confidence": confidence,
                "eligibility": eligibility,
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
