from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['hardware_db']
users = db['users']
hardware_collection = db["hardware_sets"]
projects_collection = db["projects"]

def initialize_hardware_sets():
    for name, cap in (("HWSet1", 100), ("HWSet2", 100)):
        hardware_collection.update_one(
            {"name": name},
            {
                "$setOnInsert": {"capacity": cap, "available": cap}
            },
            upsert=True,
        )

initialize_hardware_sets()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password required', 'success': False}), 400

    if users.find_one({'username': username}):
        return jsonify({'message': 'Username already exists', 'success': False}), 400

    users.insert_one({'username': username, 'password': password})
    return jsonify({'message': 'User created successfully', 'success': True}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = users.find_one({'username': username})
    if username and password:
        if user and user.get('password') == password:
            return jsonify({'message': 'Login successful', 'success': True})
        return jsonify({'message': 'Invalid username or password', 'success': False}), 401
    
@app.route('/hardware', methods=['GET'])
def get_hardware_sets():
    project_id = request.args.get('project_id')
    base_sets = list(hardware_collection.find({}, {"_id": 0}))

    if project_id:
        project = projects_collection.find_one({"project_id": project_id})
        usage = (project or {}).get('hardware_usage', {}) if project else {}
        sets = []
        for s in base_sets:
            cap = s.get('capacity', 0)
            used = int(usage.get(s.get('name'), 0))
            sets.append({
                'name': s.get('name'),
                'capacity': cap,
                'available': max(0, cap - used)
            })
        return jsonify(sets), 200

    for s in base_sets:
        if 'available' not in s:
            s['available'] = s.get('capacity', 0)
    return jsonify(base_sets), 200

@app.route('/hardware/checkout', methods=['POST'])
def checkout_hardware():
    data = request.get_json() or {}
    name = data.get('name')
    amount = int(data.get('amount', 0))
    project_id = data.get('project_id')
    username = data.get('username')

    if not name or amount <= 0 or not project_id or not username:
        return jsonify({"success": False, "message": "Provide name, positive amount, project_id, and username"}), 400

    hwset = hardware_collection.find_one({"name": name})
    if not hwset:
        return jsonify({"success": False, "message": "Hardware set not found"}), 404

    project = projects_collection.find_one({"project_id": project_id})
    if not project:
        return jsonify({"success": False, "message": "Project not found"}), 404

    members = project.get('members') or [project.get('owner') or project.get('username')]
    if username not in members:
        return jsonify({"success": False, "message": "User is not a member of this project"}), 403

    cap = int(hwset.get('capacity', 0))
    current_usage = int((project.get('hardware_usage') or {}).get(name, 0))
    if current_usage + amount > cap:
        return jsonify({"success": False, "message": "Not enough hardware available for this project"}), 400

    projects_collection.update_one(
        {"project_id": project_id},
        {"$inc": {f"hardware_usage.{name}": amount, f"user_usage.{username}.{name}": amount}}
    )

    new_usage = current_usage + amount
    available = max(0, cap - new_usage)
    return jsonify({
        "success": True,
        "message": f"Checked out {amount} from {name}",
        "hardware": {"name": name, "capacity": cap, "available": available}
    }), 200

@app.route('/hardware/checkin', methods=['POST'])
def checkin_hardware():
    data = request.get_json() or {}
    name = data.get('name')
    amount = int(data.get('amount', 0))
    project_id = data.get('project_id')
    username = data.get('username')

    if not name or amount <= 0 or not project_id or not username:
        return jsonify({"success": False, "message": "Provide name, positive amount, project_id, and username"}), 400

    hwset = hardware_collection.find_one({'name': name})
    if not hwset:
        return jsonify({'success': False, 'message': 'Hardware set not found'}), 404

    project = projects_collection.find_one({'project_id': project_id})
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    members = project.get('members') or [project.get('owner') or project.get('username')]
    if username not in members:
        return jsonify({'success': False, 'message': 'User is not a member of this project'}), 403

    cap = int(hwset.get('capacity', 0))
    current_usage = int((project.get('hardware_usage') or {}).get(name, 0))
    user_current = int(((project.get('user_usage') or {}).get(username) or {}).get(name, 0))
    if current_usage < amount:
        return jsonify({
            'success': False,
            'message': f'Project has only {current_usage} units checked out from {name}'
        }), 400
    if user_current < amount:
        return jsonify({
            'success': False,
            'message': f'User has only {user_current} units checked out from {name}'
        }), 400

    projects_collection.update_one(
        {'project_id': project_id},
        {'$inc': {f"hardware_usage.{name}": -amount, f"user_usage.{username}.{name}": -amount}}
    )

    new_usage = current_usage - amount
    available = max(0, cap - new_usage)
    return jsonify({
        'success': True,
        'message': f'Checked in {amount} units to {name}',
        'hardware': {"name": name, "capacity": cap, "available": available}
    }), 200

@app.route('/projects', methods=['POST'])
def create_project():
    data = request.get_json() or {}
    username = data.get('username')
    project_id = data.get('project_id')
    project_name = data.get('project_name')

    if not all([username, project_id, project_name]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    if projects_collection.find_one({"project_id": project_id}):
        return jsonify({"success": False, "message": "Project ID already exists"}), 400

    new_project = {
        "project_id": project_id,
        "project_name": project_name,
        "owner": username,
        "members": [username],
        "hardware_usage": {"HWSet1": 0, "HWSet2": 0}
    }
    projects_collection.insert_one(new_project)
    return jsonify({"success": True, "message": f"Project '{project_name}' created successfully."}), 201


@app.route('/projects/<username>', methods=['GET'])
def get_projects(username):
    cursor = projects_collection.find({
        "$or": [
            {"members": username},
            {"username": username},
        ]
    })
    projects = []
    for p in cursor:
        p.pop('_id', None)
        if 'members' not in p:
            owner = p.get('owner') or p.get('username') or 'unknown'
            p['owner'] = owner
            p['members'] = [owner]
        if 'owner' not in p:
            p['owner'] = p.get('username') or p.get('owner') or 'unknown'
        projects.append(p)
    return jsonify(projects), 200


@app.route('/projects', methods=['GET'])
def list_all_projects():
    cursor = projects_collection.find({})
    projects = []
    for p in cursor:
        p.pop('_id', None)
        if 'members' not in p:
            owner = p.get('owner') or p.get('username') or 'unknown'
            p['owner'] = owner
            p['members'] = [owner]
        if 'owner' not in p:
            p['owner'] = p.get('username') or p.get('owner') or 'unknown'
        projects.append(p)
    return jsonify(projects), 200


@app.route('/projects/join', methods=['POST'])
def join_project():
    data = request.get_json() or {}
    username = data.get('username')
    project_id = data.get('project_id')

    if not username or not project_id:
        return jsonify({"success": False, "message": "username and project_id required"}), 400

    project = projects_collection.find_one({"project_id": project_id})
    if not project:
        return jsonify({"success": False, "message": "Project not found"}), 404

    owner = project.get('owner') or project.get('username')
    if 'members' not in project:
        projects_collection.update_one({"project_id": project_id}, {
            "$set": {"owner": owner},
            "$setOnInsert": {"hardware_usage": {"HWSet1": 0, "HWSet2": 0}},
        })
        project = projects_collection.find_one({"project_id": project_id})
        project['members'] = [owner] if owner else []

    projects_collection.update_one(
        {"project_id": project_id},
        {"$addToSet": {"members": username}, "$set": {"owner": owner}}
    )

    updated = projects_collection.find_one({"project_id": project_id}, {"_id": 0})
    return jsonify({"success": True, "message": f"Joined project {project_id}", "project": updated}), 200

if __name__ == '__main__':
    app.run(debug=True)
