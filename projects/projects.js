import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
if (projects) {
    renderProjects(projects, projectsContainer, 'h2');
    if (projectsTitle) {
        projectsTitle.textContent = projects.length;
      }
} 
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

// let rolledData = d3.rollups(
//   projects,
//   (v) => v.length,
//   (d) => d.year,
// );

// let data = rolledData.map(([year, count]) => {
//   return { value: count, label: year};
// });

let colors = d3.scaleOrdinal([
  '#603196', // purple
  '#e69629', // orange
  '#ce9ef9', // lavender
  '#ffdd57', // yellow
  '#08865a', // green
  '#13a2a1', // blue
  '#17becf', // teal
  '#bcbd22', // olive
]);
// let sliceGenerator = d3.pie().value((d) => d.value);
// let arcData = sliceGenerator(data);
// let arcs = arcData.map((d) => arcGenerator(d));
// arcs.forEach((arc, idx) => {
//   // TODO, fill in step for appending path to svg using D3
//   d3.select('svg').append('path').attr('d', arc).attr('fill', colors(idx))
// });

// let legend = d3.select('.legend');
// data.forEach((d, idx) => {
//   legend
//     .append('li')
//     .attr('class', 'legend-item')
//     .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
//     .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
// });

let query = '';
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('change', (event) => {
  query = event.target.value;
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
  renderProjects(filteredProjects, projectsContainer, 'h2');
});

let selectedIndex = -1;

function renderPieChart(projectsGiven) {

  let newSVG = d3.select('svg');
  newSVG.selectAll('path').remove();

  d3.select('.legend').selectAll('li').remove();

  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));

  // d3.select('svg').selectAll('path').remove();
  // d3.select('.legend').selectAll('li').remove();

  newArcs.forEach((arc, idx) => {
    newSVG
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(idx))
      .attr('class', selectedIndex === idx ? 'selected' : null)
      .on('click', function () {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        newSVG.selectAll('path')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null));
          if (selectedIndex === -1) {
            renderProjects(projects, projectsContainer, 'h2');
          } else {
            const selectedYear = newData[selectedIndex].label;
            const filteredByYear = projects.filter(p => p.year === selectedYear);
            renderProjects(filteredByYear, projectsContainer, 'h2');
          }
      });
  });

  let legend = d3.select('.legend');
  newData.forEach((d, idx) => {
    legend
      .append('li')
      .attr('class', 'legend-item')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });

}

renderPieChart(projects);

searchInput.addEventListener('input', (event) => {
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(event.target.value.toLowerCase());
  });
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});