from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from backend.models.qualification import Qualification, NationalOccupationalStandard
from backend.auth_middleware import jwt_required

qualification_bp = Blueprint("qualification_bp", __name__)

@qualification_bp.route("", methods=["GET"])
def list_qualifications():
    query_str = request.args.get("q", "").strip()
    sector = request.args.get("sector", "").strip()
    nsqf_level = request.args.get("level")
    verified_only = request.args.get("verified_only", "false").lower() == "true"
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 20)), 100)

    q = Qualification.query

    if query_str:
        search_filter = or_(
            Qualification.title.ilike(f"%{query_str}%"),
            Qualification.trade.ilike(f"%{query_str}%"),
            Qualification.nqr_code.ilike(f"%{query_str}%"),
            Qualification.sector.ilike(f"%{query_str}%")
        )
        q = q.filter(search_filter)

    if sector:
        q = q.filter(Qualification.sector.ilike(f"%{sector}%"))

    if nsqf_level:
        try:
            q = q.filter(Qualification.nsqf_level == float(nsqf_level))
        except ValueError:
            pass

    if verified_only:
        q = q.filter(Qualification.is_verified == True)

    total = q.count()
    items = q.order_by(Qualification.title.asc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "total": total,
        "page": page,
        "per_page": per_page,
        "qualifications": [item.to_dict(include_children=False) for item in items]
    }), 200

@qualification_bp.route("/<string:qual_id>", methods=["GET"])
def get_qualification_detail(qual_id: str):
    qual = Qualification.query.filter(
        or_(Qualification.id == qual_id, Qualification.nqr_code == qual_id)
    ).first()
    if not qual:
        return jsonify({"error": "Qualification not found"}), 404

    return jsonify({"qualification": qual.to_dict(include_children=True)}), 200

@qualification_bp.route("/sectors", methods=["GET"])
def list_sectors():
    sectors = [r[0] for r in Qualification.query.with_entities(Qualification.sector).distinct().order_by(Qualification.sector).all() if r[0]]
    return jsonify({"sectors": sectors}), 200
