import { useEffect, useState } from 'react';

const BASE_URL = 'http://127.0.0.1:5000';

function ProjectsPanel({ username, selectedProjectId, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProjects = async () => {
    if (!username) return;
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`/projects/${encodeURIComponent(username)}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setMessage('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const fetchAll = async () => {
    try {
      const res = await fetch(`/projects`);
      const data = await res.json();
      setAllProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const isMember = (p) => {
    if (!username) return false;
    if (Array.isArray(p.members) && p.members.includes(username)) return true;
    if (p.owner === username) return true;
    if (p.username === username) return true; // legacy
    return false;
  };

  const createProject = async () => {
    const pid = projectId.trim();
    const pname = projectName.trim();
    if (!pid || !pname || !username) {
      setMessage('Enter project id and name');
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, project_id: pid, project_name: pname })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Project created');
        setProjectId('');
        setProjectName('');
        await fetchProjects();
        await fetchAll();
        onSelectProject?.(pid);
      } else {
        setMessage(data.message || 'Failed to create project');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const joinProject = async (pid) => {
    if (!username) {
      setMessage('Login to join projects');
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`/projects/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, project_id: pid })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`Joined ${pid}`);
        await fetchProjects();
        await fetchAll();
        onSelectProject?.(pid);
      } else {
        setMessage(data.message || 'Failed to join project');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h3>Projects</h3>
      <div className="project-create">
        <input
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
        <input
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <button onClick={createProject} disabled={loading || !username}>
          {loading ? 'Working...' : 'Create'}
        </button>
      </div>
      <div className="project-list">
        {loading && projects.length === 0 ? (
          <div>Loading...</div>
        ) : projects.length === 0 ? (
          <div>No projects yet</div>
        ) : (
          projects.map((p) => (
            <label key={p.project_id} className="project-item">
              <input
                type="radio"
                name="project"
                value={p.project_id}
                checked={selectedProjectId === p.project_id}
                onChange={() => onSelectProject?.(p.project_id)}
              />
              <span>{p.project_name} ({p.project_id})</span>
            </label>
          ))
        )}
      </div>
      <h4 style={{ marginTop: 16 }}>All Projects</h4>
      <div className="project-list">
        {allProjects.length === 0 ? (
          <div>No projects found</div>
        ) : (
          allProjects.map((p) => (
            <div key={p.project_id} className="project-item" style={{ justifyContent: 'space-between' }}>
              <span>
                {p.project_name} ({p.project_id}) — owner: {p.owner || p.username}
              </span>
              <span>
                {isMember(p) ? (
                  <>
                    <button onClick={() => onSelectProject?.(p.project_id)} disabled={selectedProjectId === p.project_id}>
                      {selectedProjectId === p.project_id ? 'Selected' : 'Select'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => joinProject(p.project_id)} disabled={loading}>Join</button>
                )}
              </span>
            </div>
          ))
        )}
      </div>
      {message && <div className="message">{message}</div>}
    </section>
  );
}

export default ProjectsPanel;
