import { useEffect, useState } from 'react';

const BASE_URL = 'http://127.0.0.1:5000';

function ProjectsPanel({ username, selectedProjectId, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [joinProjectId, setJoinProjectId] = useState('');
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
  }, [username]);

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
      // setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const joinProject = async (pid) => {
    if (!username) {
      setMessage('Login to join projects');
      return;
    }
    const trimmed = (pid || '').trim();
    if (!trimmed) {
      setMessage('Enter a project ID to join');
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`/projects/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, project_id: trimmed })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`Joined ${trimmed}`);
        await fetchProjects();
        onSelectProject?.(trimmed);
        setJoinProjectId('');
      } else {
        setMessage(data.message || 'Failed to join project');
      }
    } catch (e) {
      console.error(e);
      // setMessage('Error connecting to server');
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
      <h4 style={{ marginTop: 16 }}>Join a Project</h4>
      <div className="project-create">
        <input
          placeholder="Enter Project ID to join"
          value={joinProjectId}
          onChange={(e) => setJoinProjectId(e.target.value)}
        />
        <button onClick={() => joinProject(joinProjectId)} disabled={loading || !username}>
          {loading ? 'Working...' : 'Join Project'}
        </button>
      </div>
      {message && <div className="message">{message}</div>}
    </section>
  );
}

export default ProjectsPanel;
