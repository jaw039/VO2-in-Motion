// exploration.js
async function loadCombinedData() {
    const subjectInfo = await d3.csv('subject-info-cleaned.csv');
    const testMeasure = await d3.csv('test_measure-cleaned.csv');

    // Combine data using ID_test
    const combinedData = testMeasure.map(measure => {
        const subject = subjectInfo.find(sub => sub.ID_test === measure.ID_test);
        return { ...measure, ...subject };
    });

    return combinedData;
}

document.getElementById('generate-button').addEventListener('click', createDashboardGraphs);

async function createDashboardGraphs() {
    const data = await loadCombinedData();
    const selectedFactor = document.getElementById('factor').value;

    const maleData = data.filter(d => d.Sex === '0');
    const femaleData = data.filter(d => d.Sex === '1');

    // Sample 20 points for each dataset
    const sampledMaleData = d3.shuffle(maleData).slice(0, 20);
    const sampledFemaleData = d3.shuffle(femaleData).slice(0, 20);

    const factors = ['VO2', 'HR', 'Speed', 'Age', 'Weight'].filter(f => f !== selectedFactor);

    const dashboardGraphs = document.getElementById('dashboard-graphs');
    dashboardGraphs.innerHTML = ''; // Clear previous graphs

    // Add a descriptive line
    const description = document.createElement('p');
    description.className = 'dashboard-description';
    dashboardGraphs.appendChild(description);

    factors.forEach(factor => {
        // Create a section for each factor
        const section = document.createElement('div');
        section.className = 'graph-section';
        section.innerHTML = `
            <h3>${selectedFactor} vs. ${factor}</h3>
            <div class="graph-container">
                <div class="graph">
                    <h4>Male</h4>
                    <svg class="scatter-plot" id="scatter-plot-male-${factor}"></svg>
                </div>
                <div class="graph">
                    <h4>Female</h4>
                    <svg class="scatter-plot" id="scatter-plot-female-${factor}"></svg>
                </div>
            </div>
        `;
        dashboardGraphs.appendChild(section);

        // Create graphs for males and females
        createSinglePlot(`#scatter-plot-male-${factor}`, sampledMaleData, selectedFactor, factor, '#3498db');
        createSinglePlot(`#scatter-plot-female-${factor}`, sampledFemaleData, selectedFactor, factor, '#e84393');
    });
}

function createSinglePlot(selector, data, xAxis, yAxis, color) {
    const svg = d3.select(selector);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => +d[xAxis]), d3.max(data, d => +d[xAxis])])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => +d[yAxis]), d3.max(data, d => +d[yAxis])])
        .range([height, 0]);

    const xAxisGen = d3.axisBottom(xScale);
    const yAxisGen = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxisGen)
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', '#000')
        .attr('text-anchor', 'middle')
        .text(xAxis);

    svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .call(yAxisGen)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('fill', '#000')
        .attr('text-anchor', 'middle')
        .text(yAxis);

    // Add scatter plot points
    svg.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(+d[xAxis]) + margin.left)
        .attr('cy', d => yScale(+d[yAxis]) + margin.top)
        .attr('r', 5)
        .attr('fill', color)
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`${xAxis}: ${d[xAxis]}<br>${yAxis}: ${d[yAxis]}`)
                .style('left', `${event.pageX + 5}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => tooltip.style('opacity', 0));

    // Add trend line (linear regression)
    const trendLine = d3.line()
        .x(d => xScale(+d[xAxis]) + margin.left)
        .y(d => yScale(d.predicted) + margin.top);

    const regression = linearRegression(data.map(d => [+d[xAxis], +d[yAxis]]));
    const trendData = data.map(d => ({
        [xAxis]: +d[xAxis],
        predicted: regression.slope * +d[xAxis] + regression.intercept
    }));

    svg.append('path')
        .datum(trendData)
        .attr('d', trendLine)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('fill', 'none');
}

function linearRegression(data) {
    const n = data.length;
    const xSum = data.reduce((sum, [x]) => sum + x, 0);
    const ySum = data.reduce((sum, [, y]) => sum + y, 0);
    const xySum = data.reduce((sum, [x, y]) => sum + x * y, 0);
    const x2Sum = data.reduce((sum, [x]) => sum + x * x, 0);

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    return { slope, intercept };
}

// Add tooltip
const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);