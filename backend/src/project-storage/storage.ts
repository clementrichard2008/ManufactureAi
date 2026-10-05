import fs from 'fs';
import path from 'path';
import { ProjectState } from '../../../shared/src/types';

const STORAGE_DIR = path.resolve(__dirname, '../../../data/projects');

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export class ProjectStorage {
  constructor() {
    ensureDir();
  }

  saveProject(project: ProjectState): ProjectState {
    ensureDir();
    const id = project.id || `proj_${Date.now()}`;
    const updated: ProjectState = {
      ...project,
      id,
      updatedAt: new Date().toISOString()
    };
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }

  getProject(id: string): ProjectState | null {
    ensureDir();
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  listProjects(): Array<{ id: string; name: string; updatedAt: string }> {
    ensureDir();
    try {
      const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'));
      return files.map(file => {
        try {
          const content = fs.readFileSync(path.join(STORAGE_DIR, file), 'utf8');
          const p = JSON.parse(content);
          return { id: p.id, name: p.name || 'Untitled Part', updatedAt: p.updatedAt || '' };
        } catch {
          return { id: file.replace('.json', ''), name: 'Project', updatedAt: '' };
        }
      });
    } catch {
      return [];
    }
  }
}
