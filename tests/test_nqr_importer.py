from pathlib import Path
import pytest
from backend.importers.nqr_importer import NQRMasterImporter
from backend.models.qualification import Qualification

def test_nqr_master_importer(app, db_session):
    excel_path = Path("Data_Qualification_Register_11-Oct-2026.xlsx")
    assert excel_path.exists(), "NQR Excel file must exist in root"

    importer = NQRMasterImporter(excel_path)
    # Import a sample limit of 25 for quick unit test execution
    res = importer.import_master_register(limit=25)

    assert res["imported_count"] == 25
    quals = Qualification.query.all()
    assert len(quals) == 25

    # Check properties of first imported qualification
    q1 = quals[0]
    assert q1.title is not None
    assert q1.sector is not None
    assert q1.nsqf_level > 0
    assert q1.source_type == "NQR_MASTER_REGISTER"
    assert q1.is_verified is True
    assert q1.is_synthetic is False
