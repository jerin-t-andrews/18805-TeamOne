from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from dotenv import load_dotenv
import os

load_dotenv()

# Serve your Vite build from ./dist
STATIC_DIR = os.path.join(os.path.dirname(__file__), "dist")
app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/")
CORS(app)

# Read URI from env; don't let pymongo silently fall back to localhost.
MONGO_URI = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")

# Globals that are initialized on first use
client = None
db = None
users = None
hardware_collection = None
projects_collection = None

# --- Simple reversible cipher for this assignment ---
CIPHER_N = 3
CIPHER_D = 1

def _reverse_list(chars):
    left, right = 0, len(chars) - 1
    while left < right:
        chars[left], chars[right] = chars[right], chars[left]
        left += 1
        right -= 1
    return chars

def encrypt(inputText: str, n: int = CIPHER_N, d: int = CIPHER_D) -> str:
    """
    Reversible 'encrypt' used for the assignment:
      1) reverse string
      2) rotate characters in printable range [34..126] by n (or -n if d == -1)
    NOTE: This is NOT secure for real-world passwords. Use a password hasher instead.
    """
    if n < 1 or d not in (1, -1):
        raise ValueError("n must be >= 1 and d must be +1 or -1")

    # ensure str
    s = "" if inputText is None else str(inputText)
    chars = _reverse_list(list(s))

    step = n if d == 1 else -n
    for i, ch in enumerate(chars):
        code = ord(ch)
        if 34 <= code <= 126:           # printable slice we rotate inside
            temp = (code - 34 + step) % 93
            chars[i] = chr(34 + temp)
        # else: leave char unchanged (e.g., newline)
    return "".join(chars)

def decrypt(inputText: str, n: int = CIPHER_N, d: int = CIPHER_D) -> str:
    if n < 1 or d not in (1, -1):
        raise ValueError("n must be >= 1 and d must be +1 or -1")

    s = "" if inputText is None else str(inputText)
    chars = list(s)
    step = -n if d == 1 else n
    for i, ch in enumerate(chars):
        code = ord(ch)
        if 34 <= code <= 126:
            temp = (code - 34 + step) % 93
            chars[i] = chr(34 + temp)
    return "".join(_reverse_list(chars))


def connect_mongo() -> bool:
    """Establish Mongo connection once, on demand. Returns True if connected."""
    global client, db, users, hardware_collection, projects_collection
    if client is not None:
        return True
    if not MONGO_URI:
        app.logger.warning("No MONGODB_URI/MONGO_URI set; running without DB.")
        return False
    try:
        # Fail fast if not reachable
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        # Pick default DB if provided in URI, else fallback
        db = client['hardware_db']

        users = db['users']
        hardware_collection = db["hardware_sets"]
        projects_collection = db["projects"]
        return True
    except Exception as e:
        app.logger.error(f"Mongo connection failed: {e}")
        # Ensure globals remain None on failure
        for name in ("client","db","users","hardware_collection","projects_collection"):
            globals()[name] = None
        return False

def initialize_hardware_sets():
    # Make sure we have a connection first
    connect_mongo()
    if hardware_collection is None:
        app.logger.warning("DB not connected; skipping hardware init.")
        return
    for name, cap in (("HWSet1", 100), ("HWSet2", 100)):
        hardware_collection.update_one(
            {"name": name},
            {"$setOnInsert": {"capacity": cap, "available": cap}},
            upsert=True,
        )
    app.logger.info("Hardware sets initialized.")

def db_ready() -> bool:
    connect_mongo()
    return all(x is not None for x in (users, hardware_collection, projects_collection))


connect_mongo()
initialize_hardware_sets()




# @app.before_first_request
# def _warmup():
#     if connect_mongo():
#         initialize_hardware_sets()

# ---------- Static / SPA ----------
@app.route('/')
def index(): #Test
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def static_proxy(path):
    # serve static assets or fall back to index.html for SPA routes
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    return app.send_static_file('index.html')

# ---------- Health ----------
@app.route('/health')
def health():
    status = "ok"
    details = {}
    if MONGO_URI:
        try:
            if connect_mongo():
                client.admin.command("ping")
                details["mongo"] = "up"
            else:
                status = "degraded"
                details["mongo"] = "not_connected"
        except ServerSelectionTimeoutError:
            status = "degraded"
            details["mongo"] = "timeout"
        except Exception as e:
            status = "degraded"
            details["mongo"] = f"down: {e.__class__.__name__}"
    else:
        details["mongo"] = "not_configured"
    return jsonify(status=status, details=details), 200

# ---------- API ----------
@app.route('/register', methods=['POST'])
def register():
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password required', 'success': False}), 400

    if users.find_one({'username': username}):
        return jsonify({'message': 'Username already exists', 'success': False}), 400

    enc_pwd = encrypt(password)  # <- encrypt before storing
    users.insert_one({'username': username, 'password': enc_pwd})
    return jsonify({'message': 'User created successfully', 'success': True}), 201


@app.route('/login', methods=['POST'])
def login():
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    user = users.find_one({'username': username}) if username else None
    if not (username and password and user):
        return jsonify({'message': 'Invalid username or password', 'success': False}), 401

    stored = user.get('password', '')
    candidate_enc = encrypt(password)

    # Accept either exact encrypted match (new) OR plain-text match (legacy rows)
    if stored == candidate_enc or stored == password:
        return jsonify({'message': 'Login successful', 'success': True}), 200

    return jsonify({'message': 'Invalid username or password', 'success': False}), 401


@app.route('/hardware', methods=['GET'])
def get_hardware_sets():
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503

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
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503  

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
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503

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
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503

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
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503

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
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503

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
    if not db_ready():
        return jsonify({'message': 'DB not available', 'success': False}), 503

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

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=False, port=int(os.environ.get('PORT', 8080)))
