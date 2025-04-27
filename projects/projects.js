import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
if (projects) {
    renderProjects(projects, projectsContainer, 'h2');
    if (projectsTitle) {
        projectsTitle.textContent = projects.length;
      }
}  