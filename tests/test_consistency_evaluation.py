from backend.scripts.evaluate_consistency import run_consistency_evaluation

def test_inter_assessor_consistency_evaluation():
    report = run_consistency_evaluation(num_candidates=10, num_assessors=4)
    
    assert "variance_analysis" in report
    assert "inter_rater_reliability" in report
    assert report["variance_analysis"]["unassisted_mean_variance"] > report["variance_analysis"]["assisted_mean_variance"]
    assert report["variance_analysis"]["variance_reduction_percentage"] > 50.0
    assert report["inter_rater_reliability"]["assisted_icc"] > report["inter_rater_reliability"]["unassisted_icc"]
    assert report["inter_rater_reliability"]["assisted_fleiss_kappa"] > report["inter_rater_reliability"]["unassisted_fleiss_kappa"]
    assert report["inter_rater_reliability"]["assisted_exact_agreement_pct"] > report["inter_rater_reliability"]["unassisted_exact_agreement_pct"]
    assert "operational_efficiency" in report
    assert report["operational_efficiency"]["missing_evidence_rate"]["reduction_pct"] == 100.0
    assert len(report["candidate_sample_distributions"]) == 5
