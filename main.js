let data = [];
let subjectInfo = [];
let filteredData = [];
let measureData = [];
let selectedSpeed = null;
let showAverage = true; // Set to true by default
let selectedSex = '0';  // Default to male ('0')

// Loads the test_measure data before building chart
async function loadData() {
  measureData = await d3.csv('test_measure.csv', (row) => ({
    ...row,
    time: Number(row.time), 
    Speed: Number(row.Speed),
    HR: Number(row.HR),
    VO2: Number(row.VO2),
    ID: Number(row.ID)
  }));
  console.log(measureData);
  // Load subject-info data
  subjectInfo = await d3.csv('subject-info.csv', (row) => ({
    ID: Number(row.ID),
    Sex: row.Sex // Assume Sex is either '0' (Male) or '1' (Female)
  }));
  console.log(subjectInfo)

  data = measureData.map(d => ({
    ...d,
    Sex: subjectInfo.find(subject => subject.ID === d.ID)?.Sex || null
  }));

  console.log(data); // Verify merged and updated data
  
  // Apply default filter for male data only
  filteredData = data.filter(d => d.Sex === '0'); 
  buildChart();
}

// Calculate average VO2 values by time for a given dataset
function calculateAveragesByTime(dataToAverage) {
  // Group by time
  const groupedByTime = d3.group(dataToAverage, d => d.time);
  
  // Calculate average VO2 for each time point
  const averages = Array.from(groupedByTime, ([time, values]) => {
    return {
      time: +time,
      VO2: d3.mean(values, d => d.VO2),
      Sex: dataToAverage[0].Sex, // Keep the sex information for coloring
      Speed: dataToAverage[0].Speed // Keep the speed information
    };
  }).sort((a, b) => a.time - b.time); // Sort by time
  
  return averages;
}

// Builds the line chart
function buildChart() {
  // Clear existing chart
  d3.select('#line-graph').selectAll('*').remove();

  // Setting dimensions for svg
  const width = 928;
  const height = 600;
  const marginTop = 20;
  const marginRight = 100; // Increased right margin to make room for labels
  const marginBottom = 40;
  const marginLeft = 60;

  const svg = d3.select('#line-graph')
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "max-width: 100%; height: auto; -webkit-tap-highlight-color: transparent;");

  // Added X label
  svg.append('text')
    .attr('x', (width - marginLeft - marginRight) / 2 + marginLeft) // Center of the x-axis
    .attr('y', height ) // Slightly below the x-axis
    .attr('text-anchor', 'middle') // Center align the text
    .attr('font-size', '14px')
    .attr('fill', 'black')
    .text('Time (seconds)'); // Replace with your label

  // Added Y label
  svg.append('text')
    .attr('x', -(height - marginTop - marginBottom) / 2 - marginTop) // Center of the y-axis (rotated)
    .attr('y', 11) // Slightly to the left of the y-axis
    .attr('transform', 'rotate(-90)') // Rotate the text to be vertical
    .attr('text-anchor', 'middle') // Center align the text
    .attr('font-size', '14px')
    .attr('fill', 'black')
    .text('VO2 (mL/kg/min)'); // Replace with your label
  
  // Adding X and Y axis
  const xScale = d3.scaleLinear()
      .domain([d3.min(filteredData, d => d.time), d3.max(filteredData, d => d.time)])
      .range([marginLeft, width - marginRight]);
      
  const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.VO2) * 1.1]) // Add 10% padding at the top
      .range([height - marginBottom, marginTop]); // Note: y is inverted in SVG
      
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);
    
  svg.append('g')
    .attr('transform', `translate(0, ${height - marginBottom})`)
    .call(xAxis);
    
  svg.append('g')
    .attr('transform', `translate(${marginLeft}, 0)`)
    .call(yAxis);
  
  if (showAverage) {
    // Group data by sex
    const groups = d3.group(filteredData, d => d.Sex);
    
    groups.forEach((groupData, groupKey) => {
      // If speed is selected, further group by speed and only show the selected speed
      if (selectedSpeed !== null) {
        const speedData = groupData.filter(d => d.Speed === selectedSpeed);
        if (speedData.length > 0) {
          // Calculate averages for this sex and speed group
          const averageData = calculateAveragesByTime(speedData);
          
          // Create line with averages
          const line = d3.line()
            .x(d => xScale(d.time))
            .y(d => yScale(d.VO2));

          svg.append('path')
            .datum(averageData)
            .attr('fill', 'none')
            .attr('stroke', groupKey === '0' ? 'blue' : 'pink') // '0' for Male (blue), '1' for Female (pink)
            .attr('stroke-width', 2.5) // Make average lines thicker
            .attr('d', line);
            
          // Add a label for the line - using a better position method
          // Get the second-to-last data point instead of the last one
          const labelPoint = averageData[Math.max(0, averageData.length - 10)]; // 10 points from the end
          
          // First create a white background for the text for better contrast
          svg.append('rect')
            .attr('x', xScale(labelPoint.time) - 35) // Make rectangle wider than the text
            .attr('y', yScale(labelPoint.VO2) - 22) // Position above the text
            .attr('width', 70) // Width of the background
            .attr('height', 18) // Height of the background
            .attr('fill', 'white') // White background
            .attr('stroke', groupKey === '0' ? 'blue' : 'pink') // Border color matching the line
            .attr('stroke-width', 1)
            .attr('rx', 4) // Rounded corners
            .attr('ry', 4);
          
          svg.append('text')
            .attr('x', xScale(labelPoint.time))
            .attr('y', yScale(labelPoint.VO2) - 10) // Position above the line
            .attr('font-size', '12px')
            .attr('font-weight', 'bold') // Make text bold
            .attr('fill', 'black') // Black text
            .attr('text-anchor', 'middle')
            .text(groupKey === '0' ? 'Male Avg' : 'Female Avg');
        }
      } else {
        // No speed selected, calculate averages across all speeds
        const averageData = calculateAveragesByTime(groupData);
        
        // Create line with averages
        const line = d3.line()
          .x(d => xScale(d.time))
          .y(d => yScale(d.VO2));

        svg.append('path')
          .datum(averageData)
          .attr('fill', 'none')
          .attr('stroke', groupKey === '0' ? 'blue' : 'pink') // '0' for Male (blue), '1' for Female (pink)
          .attr('stroke-width', 2.5) // Make average lines thicker
          .attr('d', line);
          
        // Add a label for the line - using a better position
        // Get a point near the end but not the very end
        const labelPoint = averageData[Math.max(0, averageData.length - 10)]; // 10 points from the end
        
        // First create a white background for the text for better contrast
        svg.append('rect')
          .attr('x', xScale(labelPoint.time) - 35) // Make rectangle wider than the text
          .attr('y', yScale(labelPoint.VO2) - 22) // Position above the text
          .attr('width', 70) // Width of the background
          .attr('height', 18) // Height of the background
          .attr('fill', 'white') // White background
          .attr('stroke', groupKey === '0' ? 'blue' : 'pink') // Border color matching the line
          .attr('stroke-width', 1)
          .attr('rx', 4) // Rounded corners
          .attr('ry', 4);
        
        svg.append('text')
          .attr('x', xScale(labelPoint.time))
          .attr('y', yScale(labelPoint.VO2) - 10) // Position above the line
          .attr('font-size', '12px')
          .attr('font-weight', 'bold') // Make text bold
          .attr('fill', 'black') // Black text
          .attr('text-anchor', 'middle')
          .text(groupKey === '0' ? 'Male Avg' : 'Female Avg');
      }
    });
  } else {
    // This section would show individual lines, but we're skipping it by default
    const groups = d3.group(filteredData, d => d.Sex);
    groups.forEach((groupData, groupKey) => {
      const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.VO2));

      svg.append('path')
        .datum(groupData)
        .attr('fill', 'none')
        .attr('stroke', groupKey === '0' ? 'blue' : 'pink') // '0' for Male (blue), '1' for Female (pink)
        .attr('stroke-width', 1.5)
        .attr('d', line);
    });
  }
  
  // Add title showing current filter
  let titleText = `VO2 Consumption - ${selectedSex === '0' ? 'Male' : selectedSex === '1' ? 'Female' : 'All Subjects'}`;
  if (selectedSpeed !== null) {
    titleText += ` at Speed ${selectedSpeed}`;
  }
  
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', marginTop)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text(titleText);
  
  // Add legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width - marginRight - 100}, ${marginTop + 20})`);
    
  if (filteredData.some(d => d.Sex === '0')) {
    legend.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 20)
      .attr('y2', 0)
      .attr('stroke', 'blue')
      .attr('stroke-width', 2.5);
      
    legend.append('text')
      .attr('x', 25)
      .attr('y', 5)
      .text('Male')
      .attr('font-size', '12px');
  }
  
  if (filteredData.some(d => d.Sex === '1')) {
    legend.append('line')
      .attr('x1', 0)
      .attr('y1', 20)
      .attr('x2', 20)
      .attr('y2', 20)
      .attr('stroke', 'pink')
      .attr('stroke-width', 2.5);
      
    legend.append('text')
      .attr('x', 25)
      .attr('y', 25)
      .text('Female')
      .attr('font-size', '12px');
  }
}

// Combines filtering by Speed and Sex
function applyCombinedFilter(sex) {
  selectedSex = sex;
  filteredData = data.filter(d => {
    const matchesSpeed = selectedSpeed === null || d.Speed === selectedSpeed; // Match speed if selected
    const matchesSex = sex === 'Both' || d.Sex === sex; // Match sex if specified
    return matchesSpeed && matchesSex;
  });
  buildChart(); // Rebuild chart with combined filters
}

// Adds event listeners to speed filter buttons
function addSpeedButtonListeners() {
  const buttons = document.querySelectorAll('button[data-speed]');
  const averageToggle = document.getElementById('averageToggle');
  
  // Add listener for the average toggle button if it exists
  if (averageToggle) {
    averageToggle.addEventListener('click', () => {
      showAverage = !showAverage;
      averageToggle.textContent = showAverage ? 'Show Individual Lines' : 'Show Average Lines';
      buildChart(); // Rebuild the chart
    });
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Clear active class from all buttons
      buttons.forEach(btn => btn.classList.remove('active'));
      
      // If clicking the same button, toggle it off
      if (selectedSpeed === Number(button.getAttribute('data-speed'))) {
        selectedSpeed = null;
      } else {
        selectedSpeed = Number(button.getAttribute('data-speed')); // Get selected speed
        button.classList.add('active'); // Add active class to the selected button
      }
      
      console.log('Speed selected:', selectedSpeed);
      applyCombinedFilter(selectedSex); // Maintain current sex filter when changing speed
    });
  });
}

// Adds event listeners to sex filter buttons
function addSexButtonListeners() {
  const maleButton = document.getElementById('maleButton');
  const femaleButton = document.getElementById('femaleButton');
  const bothButton = document.getElementById('bothButton');

  // Set default active state for male button
  if (maleButton) {
    maleButton.classList.add('active');
  }

  // Male Button: Filter data where Sex is '0'
  maleButton.addEventListener('click', () => {
    // Clear active class from all buttons
    [maleButton, femaleButton, bothButton].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    maleButton.classList.add('active');
    
    applyCombinedFilter('0'); // Apply combined filter for Male
    console.log('Filtered for Male');
  });

  // Female Button: Filter data where Sex is '1'
  femaleButton.addEventListener('click', () => {
    // Clear active class from all buttons
    [maleButton, femaleButton, bothButton].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    femaleButton.classList.add('active');
    
    applyCombinedFilter('1'); // Apply combined filter for Female
    console.log('Filtered for Female');
  });

  // Both Button: Show all data
  bothButton.addEventListener('click', () => {
    // Clear active class from all buttons
    [maleButton, femaleButton, bothButton].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    bothButton.classList.add('active');
    
    applyCombinedFilter('Both'); // Apply combined filter for Both
    console.log('Filtered for Both');
  });
}

// Load data and attach listeners to buttons
document.addEventListener('DOMContentLoaded', async () => {
  await loadData(); // Load and merge the data
  
  // Create toggle button for showing averages (optional - can be removed)
  const controlsContainer = document.querySelector('.controls') || document.body;
  const averageToggle = document.createElement('button');
  averageToggle.id = 'averageToggle';
  averageToggle.textContent = 'Show Individual Lines';
  averageToggle.classList.add('btn', 'btn-primary', 'mx-2');
  averageToggle.style.display = 'none'; // Hide this button since we're only showing averages
  controlsContainer.appendChild(averageToggle);
  
  addSpeedButtonListeners(); // Attach listeners to speed buttons
  addSexButtonListeners();
});