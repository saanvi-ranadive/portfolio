import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
  
    return data;
  }

  function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/saanvi-ranadive/portfolio/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,     
            writable: true,        
            configurable: true     
          });
  
        return ret;
      })
      .sort((a, b) => a.datetime - b.datetime); // Sort commits by datetime
  }

  function renderCommitInfo(data, commits) {
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add more stats as needed...

    // Average file length (by 'length' field, grouped by file)
    const fileLengths = d3.rollup(data, v => d3.mean(v, d => d.length), d => d.file);
    const avgFileLength = d3.mean(Array.from(fileLengths.values()));
    dl.append('dt').text('Average file length (lines)');
    dl.append('dd').text(avgFileLength.toFixed(1));

    // Number of unique files (assuming 'file' is a field in your CSV)
    const uniqueFiles = new Set(data.map(d => d.file));
    dl.append('dt').text('Unique files');
    dl.append('dd').text(uniqueFiles.size);

    // Time of day analysis
    const hourGroups = {
        morning: 0,    // 5am - 12pm
        afternoon: 0,  // 12pm - 5pm
        evening: 0,    // 5pm - 9pm
        night: 0       // 9pm - 5am
    };

    data.forEach(d => {
        const hour = d.datetime.getHours();
        if (hour >= 5 && hour < 12) hourGroups.morning++;
        else if (hour >= 12 && hour < 17) hourGroups.afternoon++;
        else if (hour >= 17 && hour < 21) hourGroups.evening++;
        else hourGroups.night++;
    });

    const peakTime = Object.entries(hourGroups).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    dl.append('dt').text('Most active time of day');
    dl.append('dd').text(peakTime.charAt(0).toUpperCase() + peakTime.slice(1));
  }

    function renderScatterPlot(data, commits) {
        // Put all the JS code of Steps inside this function
        const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

        const width = 1400;
        const height = 800;

        const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

        xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();

        yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

        const margin = { top: 30, right: 10, bottom: 30, left: 20 };

        const usableArea = {
            top: margin.top,
            right: width - margin.right,
            bottom: height - margin.bottom,
            left: margin.left,
            width: width - margin.left - margin.right,
            height: height - margin.top - margin.bottom,
        };
        
        // Update scales with new ranges
        xScale.range([usableArea.left, usableArea.right]);
        yScale.range([usableArea.bottom, usableArea.top]);

        // Add gridlines BEFORE the axes
        const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

        // Create gridlines as an axis with no labels and full-width ticks
        gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

        // Create the axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

        const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
        const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 20]);

        const dots = svg.append('g').attr('class', 'dots');

        dots
            .selectAll('circle')
            .data(sortedCommits, (d) => d.id)
            .join('circle')
            .attr('cx', (d) => xScale(d.datetime))
            .attr('cy', (d) => yScale(d.hourFrac))
            .attr('r', (d) => rScale(d.totalLines))
            .attr('fill', 'steelblue')
            .on('mouseenter', (event, commit) => {
                renderTooltipContent(commit);
                updateTooltipVisibility(true);
                updateTooltipPosition(event);
              })
            .on('mouseleave', () => {
                // TODO: Hide the tooltip
                updateTooltipVisibility(false);
              });

        // Add X axis
        svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis')
        .call(xAxis);

        // Add Y axis
        svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis')
        .call(yAxis);

        createBrushSelector(svg);
    }

    function updateScatterPlot(data, commits) {
      const width = 1400;
      const height = 800;
      const margin = { top: 10, right: 10, bottom: 30, left: 20 };
      const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
    
      const svg = d3.select('#chart').select('svg');
    
      xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));
    
      const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
      const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);
    
      const xAxis = d3.axisBottom(xScale);
    
      // CHANGE: we should clear out the existing xAxis and then create a new one.
      // svg
      //   .append('g')
      //   .attr('transform', `translate(0, ${usableArea.bottom})`)
      //   .call(xAxis);
      const xAxisGroup = svg.select('g.x-axis');
      xAxisGroup.selectAll('*').remove();
      xAxisGroup.call(xAxis);
    
      const dots = svg.select('g.dots');
    
      const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
      dots
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', (event, commit) => {
          d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
          renderTooltipContent(commit);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
          d3.select(event.currentTarget).style('fill-opacity', 0.7);
          updateTooltipVisibility(false);
        });
    }
  
  let data = await loadData();
  let commits = processCommits(data);
  let filteredCommits = commits;

  function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap((d) => d.lines);
    let files = d3
      .groups(lines, (d) => d.file)
      .map(([name, lines]) => {
        return { name, lines };
      })
      .sort((a, b) => b.lines.length - a.lines.length);
    
    let filesContainer = d3
      .select('#files')
      .selectAll('div')
      .data(files, (d) => d.name)
      .join(
        // This code only runs when the div is initially rendered
        (enter) =>
          enter.append('div').call((div) => {
            div.append('dt').append('code');
            div.append('dd');
          }),
      );

    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    
    // This code updates the div info
    // filesContainer.select('dt > code').text((d) => d.name);
    // filesContainer.select('dd').html((d) => `<span class="line-count">${d.lines.length} lines</span>`);
    filesContainer.select('dt').html((d) => 
      `<code>${d.name}</code><small>${d.lines.length} lines</small>`
    );
    filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
  }

  renderCommitInfo(data, commits);
  renderScatterPlot(data, filteredCommits);

  let commitProgress = 100;

  let timeScale = d3
    .scaleTime()
    .domain([
      d3.min(commits, (d) => d.datetime),
      d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);
  let commitMaxTime = timeScale.invert(commitProgress);


  const slider = document.getElementById('commit-progress');
  const timeEl = document.getElementById('commit-time');
  
  function onTimeSliderChange() {
    commitProgress = +slider.value;
    
    commitMaxTime = timeScale.invert(commitProgress);
    
    timeEl.textContent = commitMaxTime.toLocaleString(undefined, {
      dateStyle: 'long',
      timeStyle: 'short'
    });

    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
  }
  
  slider.addEventListener('input', onTimeSliderChange);
  onTimeSliderChange();

  function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
    time.textContent = commit.time;
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
  }

  function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
  }
  function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }
  function createBrushSelector(svg) {
    const brush = d3.brush().on('start brush end', brushed);
    svg.call(brush);
    svg.selectAll('.dots, .overlay ~ *').raise();
  }

  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
  
  function isCommitSelected(selection, commit) {
    if (!selection) {
      return false;
    }
    // TODO: return true if commit is within brushSelection
    // and false if not
    const [x0, x1] = selection.map((d) => d[0]);
    const [y0, y1] = selection.map((d) => d[1]);
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  }

  d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

  function onStepEnter(response) {
    console.log(response.element.__data__.datetime);
    
    // Get the current commit from the step data
    const currentCommit = response.element.__data__;
    
    // Filter commits up to the current step's datetime
    const commitsUpToNow = commits.filter((d) => d.datetime <= currentCommit.datetime);
    
    // Update the scatter plot with filtered commits
    updateScatterPlot(data, commitsUpToNow);
    updateFileDisplay(commitsUpToNow);
  }
  
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);