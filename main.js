// Variables to track current selection (for display purposes)
let currentSelectionText = "Male, All speeds";
let data = [];
let subjectInfo = [];
let filteredData = [];
let measureData = [];
let selectedSpeed = null;
let showAverage = true; // Set to true by default
let selectedSex = '0';  // Default to male ('0')

const runnerMan = document.getElementById('runner-m');
const runnerWoman = document.getElementById('runner-f');
const heartMan = document.getElementById('heart-m');
const heartWoman = document.getElementById('heart-f');
const heartContainerMan = document.getElementById('heart-container-m');
const heartContainerWoman = document.getElementById('heart-container-f');

// Fix the broken updateSelectionText function
function updateSelectionText() {
    const sexText = selectedSex === '0' ? 'Male' : (selectedSex === '1' ? 'Female' : 'Both');
    const speedText = selectedSpeed ? `Speed ${selectedSpeed}` : 'All speeds';
    currentSelectionText = `${sexText, speedText}`;
    
    // Update the text in the UI
    const selectionElement = document.getElementById('current-selection');
    if (selectionElement) {
        selectionElement.textContent = currentSelectionText;
    }
}

// Replace your current loadData function with this optimized version
async function loadData() {
  // Add loading indicator
  const container = document.getElementById('line-graph').parentElement || document.body;
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loading-indicator';
  loadingIndicator.textContent = 'Loading data...';
  loadingIndicator.style.position = 'absolute';
  loadingIndicator.style.top = '50%';
  loadingIndicator.style.left = '50%';
  loadingIndicator.style.transform = 'translate(-50%, -50%)';
  loadingIndicator.style.padding = '15px';
  loadingIndicator.style.background = 'rgba(255,255,255,0.9)';
  loadingIndicator.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  loadingIndicator.style.borderRadius = '5px';
  loadingIndicator.style.zIndex = '1000';
  container.appendChild(loadingIndicator);
  
  try {
    // Optimize subject-info loading - only get what we need
    loadingIndicator.textContent = 'Loading demographic data...';
    const subjectInfo = await d3.csv('subject-info.csv', function(row) {
      return {
        ID: +row.ID,
        Sex: row.Sex
      };
    });
    
    // Create a lookup object for faster joins
    const subjectLookup = {};
    subjectInfo.forEach(function(subject) {
      subjectLookup[subject.ID] = subject.Sex;
    });
    
    // Load and transform test measure data
    loadingIndicator.textContent = 'Loading measurement data...';
    const measureData = await d3.csv('test_measure.csv', function(row) {
      return {
        time: +row.time,
        Speed: +row.Speed,
        HR: +row.HR || null, // Handle missing values
        VO2: +row.VO2,
        ID: +row.ID,
        // Add Sex directly during load using lookup
        Sex: subjectLookup[+row.ID] || null
      };
    });
    
    // Store complete data
    data = measureData;
    
    // Pre-filter for common cases and cache results
    dataCache = {
      male: data.filter(d => d.Sex === '0'),
      female: data.filter(d => d.Sex === '1'),
      speeds: {}
    };
    
    // Pre-calculate common speed filters
    [5, 6, 7, 8].forEach(speed => {
      dataCache.speeds[speed] = {
        all: data.filter(d => d.Speed === speed),
        male: data.filter(d => d.Sex === '0' && d.Speed === speed),
        female: data.filter(d => d.Sex === '1' && d.Speed === speed)
      };
    });
    
    // Apply default filter for male data
    filteredData = dataCache.male;
    
    // Remove loading indicator
    container.removeChild(loadingIndicator);
    return true;
  }
  catch(error) {
    console.error("Error loading data:", error);
    loadingIndicator.textContent = "Error loading data. Please refresh.";
    loadingIndicator.style.color = "red";
    return false;
  }
}

// Calculate average VO2 values by time for a given dataset
function calculateAveragesByTime(dataToAverage) {
  // Group by time
  const groupedByTime = d3.group(dataToAverage, function(d) { return d.time; });
  
  // Calculate average VO2 for each time point
  const averages = Array.from(groupedByTime, function([time, values]) {
    return {
      time: +time,
      VO2: d3.mean(values, function(d) { return d.VO2; }),
      Sex: dataToAverage[0].Sex, // Keep the sex information for coloring
      Speed: dataToAverage[0].Speed // Keep the speed information
    };
  }).sort(function(a, b) { return a.time - b.time; }); // Sort by time
  
  return averages;
}

// Enhanced buildChart function with improved styling
function enhancedBuildChart() {
  // Clear existing chart
  d3.select('#line-graph').selectAll('*').remove();

  // Setting dimensions for svg
  const width = 928;
  const height = 500; // Reduced height to fit better in the panel
  const marginTop = 30;
  const marginRight = 100;
  const marginBottom = 50;
  const marginLeft = 70;

  const svg = d3.select('#line-graph')
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; -webkit-tap-highlight-color: transparent;");

  // Add a light grid background
  svg.append("rect")
    .attr("width", width - marginLeft - marginRight)
    .attr("height", height - marginTop - marginBottom)
    .attr("x", marginLeft)
    .attr("y", marginTop)
    .attr("fill", "#f8f9fa")
    .attr("rx", 8); // Rounded corners

  // Define scales with appropriate domains
  const xScale = d3.scaleLinear()
    .domain([d3.min(filteredData, function(d) { return d.time; }), d3.max(filteredData, function(d) { return d.time; })])
    .range([marginLeft, width - marginRight]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(filteredData, function(d) { return d.VO2; }) * 1.1])
    .range([height - marginBottom, marginTop]);
    
  // Adding grid lines for better readability
  svg.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0, ${height - marginBottom})`)
    .call(
      d3.axisBottom(xScale)
        .tickSize(-(height - marginTop - marginBottom))
        .tickFormat('')
    )
    .attr('opacity', 0.1)
    .attr('stroke', '#aaa');
  
  svg.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(${marginLeft}, 0)`)
    .call(
      d3.axisLeft(yScale)
        .tickSize(-(width - marginLeft - marginRight))
        .tickFormat('')
    )
    .attr('opacity', 0.1)
    .attr('stroke', '#aaa');

  // Adding X and Y axis with improved styling
  const xAxis = d3.axisBottom(xScale)
    .tickPadding(10)
    .tickSize(5);
    
  const yAxis = d3.axisLeft(yScale)
    .tickPadding(10)
    .tickSize(5);

  svg.append('g')
    .attr('transform', `translate(0, ${height - marginBottom})`)
    .call(xAxis)
    .attr('font-family', 'Segoe UI')
    .attr('font-size', '12px')
    .attr('color', '#555');

  svg.append('g')
    .attr('transform', `translate(${marginLeft}, 0)`)
    .call(yAxis)
    .attr('font-family', 'Segoe UI')
    .attr('font-size', '12px')
    .attr('color', '#555');

  // Add labels with improved styling
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '500')
    .attr('fill', '#555')
    .text('Time (seconds)');

  svg.append('text')
    .attr('x', -height / 2)
    .attr('y', 25)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '500')
    .attr('fill', '#555')
    .text('VO₂ (mL/kg/min)');

  // Process and display the data with smoother lines
  processAndDisplaySmootherGroups(svg, xScale, yScale, width, marginRight, marginTop);

  // Define and append the brush with styling
  const brush = d3.brushX()
    .extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]])
    .on("end", brushed);

  svg.append("g")
    .attr("class", "brush")
    .call(brush);
  
  // Style the brush
  svg.selectAll(".selection")
    .attr("fill", "#3498db")
    .attr("fill-opacity", 0.2)
    .attr("stroke", "#3498db")
    .attr("stroke-width", 1);

  // Add tooltip for interactive data exploration
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
    
  // Add interactive points that show exact values on hover
  const groups = d3.group(filteredData, function(d) { return d.Sex; });
  groups.forEach(function(groupData, groupKey) {
    // Sample points to avoid overcrowding (show every 10th point)
    const sampledPoints = groupData.filter(function(d, i) { return i % 10 === 0; });
    
    svg.selectAll("circle.group-" + groupKey)
      .data(sampledPoints)
      .enter()
      .append("circle")
      .attr("class", "group-" + groupKey)
      .attr("cx", function(d) { return xScale(d.time); })
      .attr("cy", function(d) { return yScale(d.VO2); })
      .attr("r", 3)
      .attr("fill", groupKey === '0' ? "#3498db" : "#e84393")
      .attr("opacity", 0.5)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 5)
          .attr("opacity", 1);
          
        tooltip.transition()
          .duration(200)
          .style("opacity", 0.9);
          
        tooltip.html(
          "<strong>Time:</strong> " + d.time + "s<br/>" +
          "<strong>Speed:</strong> " + d.Speed + "<br/>" +
          "<strong>VO₂:</strong> " + d.VO2.toFixed(2) + "<br/>" +
          "<strong>Sex:</strong> " + (d.Sex === '0' ? 'Male' : 'Female')
        )
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 3)
          .attr("opacity", 0.5);
          
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  });
  
  function brushed(event) {
    const selection = event.selection;
    if (selection) {
      const [x0, x1] = selection.map(xScale.invert);
      
      // Get data within the selected time range
      const filtered = filteredData.filter(function(d) { return d.time >= x0 && d.time <= x1; });
      
      // Calculate averages based on selected sex filter
      if (selectedSex === 'Both') {
        // Calculate overall average VO2
        const averageVO2 = d3.mean(filtered, function(d) { return d.VO2; });
        document.getElementById('average-vo2-value').textContent = 
            !isNaN(averageVO2) ? averageVO2.toFixed(2) : "N/A";
        
        // Calculate male average
        const maleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '0'; }), function(d) { return d.VO2; });
        document.getElementById('male-vo2-value').textContent = 
            !isNaN(maleAverageVO2) ? maleAverageVO2.toFixed(2) : "N/A";
        
        // Calculate female average
        const femaleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '1'; }), function(d) { return d.VO2; });
        document.getElementById('female-vo2-value').textContent = 
            !isNaN(femaleAverageVO2) ? femaleAverageVO2.toFixed(2) : "N/A";
        
        // Show all average displays
        document.getElementById('overall-average-container').style.display = 'block';
        document.getElementById('male-average-container').style.display = 'block';
        document.getElementById('female-average-container').style.display = 'block';
      } 
      else if (selectedSex === '0') {
        // Only show male average
        const maleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '0'; }), function(d) { return d.VO2; });
        document.getElementById('male-vo2-value').textContent = 
            !isNaN(maleAverageVO2) ? maleAverageVO2.toFixed(2) : "N/A";
        
        // Hide other displays
        document.getElementById('overall-average-container').style.display = 'none';
        document.getElementById('male-average-container').style.display = 'block';
        document.getElementById('female-average-container').style.display = 'none';
      }
      else if (selectedSex === '1') {
        // Only show female average
        const femaleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '1'; }), function(d) { return d.VO2; });
        document.getElementById('female-vo2-value').textContent = 
            !isNaN(femaleAverageVO2) ? femaleAverageVO2.toFixed(2) : "N/A";
        
        // Hide other displays
        document.getElementById('overall-average-container').style.display = 'none';
        document.getElementById('male-average-container').style.display = 'none';
        document.getElementById('female-average-container').style.display = 'block';
      }
      
      // Highlight the brushed region with a different background
      svg.selectAll(".highlighted-region").remove();
      svg.append("rect")
        .attr("class", "highlighted-region")
        .attr("x", selection[0])
        .attr("y", marginTop)
        .attr("width", selection[1] - selection[0])
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", "#ffeaa7") // Soft yellow fill
        .attr("opacity", 0.3)
        .lower(); // Put behind other elements
    } else {
      // If no selection, reset values
      document.getElementById('average-vo2-value').textContent = "N/A";
      document.getElementById('male-vo2-value').textContent = "N/A";
      document.getElementById('female-vo2-value').textContent = "N/A";
      
      // Remove highlighted region
      svg.selectAll(".highlighted-region").remove();
    }
  }
}

// New function for displaying smoother line groups
function processAndDisplaySmootherGroups(svg, xScale, yScale, width, marginRight, marginTop) {
  // Remove previous legends to ensure they're updated correctly
  svg.selectAll(".legend").remove();

  // Set up the legend
  const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(" + (width - marginRight - 150) + ", " + marginTop + ")");

  // Group data by Sex - limit data points for better performance
  const groups = d3.group(filteredData, function(d) { return d.Sex; });
  let yOffset = 0; // For legend positioning
  
  // Process fewer data points for smoother rendering
  const MAX_POINTS = 500; // Maximum number of points to render for performance
  
  groups.forEach(function(groupData, groupKey) {
    // Check if there's any data to show for this group
    if (groupData.length > 0) {
      // Apply speed filter if selected
      if (selectedSpeed !== null) {
        groupData = groupData.filter(function(d) { return d.Speed === selectedSpeed; });
      }

      // Downsample large datasets
      if (groupData.length > MAX_POINTS) {
        const skipFactor = Math.ceil(groupData.length / MAX_POINTS);
        groupData = groupData.filter((d, i) => i % skipFactor === 0);
      }

      // Sort data by time for proper line rendering
      groupData.sort(function(a, b) { return a.time - b.time; });
      
      // Define a smoother line generator
      const line = d3.line()
        .x(function(d) { return xScale(d.time); })
        .y(function(d) { return yScale(d.VO2); })
        .curve(d3.curveMonotoneX); // This curve type creates smoother transitions

      // Draw line with transition for animation
      const path = svg.append('path')
        .datum(groupData)
        .attr('fill', 'none')
        .attr('stroke', groupKey === '0' ? '#3498db' : '#e84393')
        .attr('stroke-width', 3)
        .attr('d', line);
        
      // Add line animation (optional)
      const pathLength = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", pathLength)
        .attr("stroke-dashoffset", pathLength)
        .transition()
        .duration(1000)
        .attr("stroke-dashoffset", 0);

      // Update legend with sex information
      updateEnhancedLegend(legend, groupKey, 0, yOffset);
      yOffset += 24; // Increment for next legend item
        
      // Add annotations for key points if showing a specific speed
      if (selectedSpeed !== null && groupData.length > 0) {
        // Find maximum VO2 point to annotate
        const maxPoint = d3.max(groupData, function(d) { return d.VO2; });
        const maxDataPoint = groupData.find(function(d) { return d.VO2 === maxPoint; });
          
        if (maxDataPoint) {
          // Add circle at max point
          svg.append("circle")
            .attr("cx", xScale(maxDataPoint.time))
            .attr("cy", yScale(maxDataPoint.VO2))
            .attr("r", 5)
            .attr("fill", groupKey === '0' ? "#3498db" : "#e84393")
            .attr("stroke", "white");
            
          // Add annotation text
          svg.append("text")
            .attr("x", xScale(maxDataPoint.time) + 10)
            .attr("y", yScale(maxDataPoint.VO2) - 10)
            .attr("text-anchor", "start")
            .attr("font-size", "12px")
            .attr("fill", groupKey === '0' ? "#3498db" : "#e84393")
            .text("Max: " + maxDataPoint.VO2.toFixed(1));
        }
      }
    }
  });
}

// Enhanced function for updating the legend
function updateEnhancedLegend(legend, groupKey, xOffset, yOffset) {
  const color = groupKey === '0' ? '#3498db' : '#e84393'; // More refined colors
  const textLabel = groupKey === '0' ? 'Male' : 'Female';

  // Add colored rectangle for the legend
  legend.append("rect")
      .attr("x", xOffset)
      .attr("y", yOffset)
      .attr("width", 18)
      .attr("height", 18)
      .attr("rx", 3) // Rounded corners
      .style("fill", color);

  // Add text label next to the rectangle
  legend.append("text")
      .attr("x", xOffset + 24)
      .attr("y", yOffset + 14)
      .text(textLabel)
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("text-anchor", "start")
      .style("alignment-baseline", "middle");
}

// Optimize heart visualization by caching calculations
function enhancedHeartVisualization() {
    // Skip if no speed is selected
    if (!selectedSpeed) return;
    
    // Get heart elements
    const maleHeart = document.getElementById('heart-m');
    const femaleHeart = document.getElementById('heart-f');
    const maleHeartRate = document.getElementById('heart-rate-m');
    const femaleHeartRate = document.getElementById('heart-rate-f');
    
    // Create cache key for heart rate and VO2 calculations
    const cacheKey = `heart_${selectedSpeed}`;
    
    // Calculate or retrieve cached heart rates and VO2 values
    let maleAvgHR, femaleAvgHR, maleAvgVO2, femaleAvgVO2;
    
    if (dataCache.averages[cacheKey]) {
      // Use cached values
      maleAvgHR = dataCache.averages[cacheKey].maleAvgHR;
      femaleAvgHR = dataCache.averages[cacheKey].femaleAvgHR;
      maleAvgVO2 = dataCache.averages[cacheKey].maleAvgVO2;
      femaleAvgVO2 = dataCache.averages[cacheKey].femaleAvgVO2;
    } else {
      // Calculate and cache
      const maleData = getFilteredData('0', selectedSpeed);
      const femaleData = getFilteredData('1', selectedSpeed);
      
      maleAvgHR = maleData.length ? Math.round(d3.mean(maleData, d => d.HR)) : 0;
      maleAvgVO2 = maleData.length ? Math.round(d3.mean(maleData, d => d.VO2)) : 0;
      femaleAvgHR = femaleData.length ? Math.round(d3.mean(femaleData, d => d.HR)) : 0;
      femaleAvgVO2 = femaleData.length ? Math.round(d3.mean(femaleData, d => d.VO2)) : 0;
      
      // Cache for reuse
      dataCache.averages[cacheKey] = {
        maleAvgHR, femaleAvgHR, maleAvgVO2, femaleAvgVO2
      };
    }
    
    // Only update hearts that are currently visible - saves CPU
    if ((selectedSex === '0' || selectedSex === 'Both') && maleHeart && maleHeartRate) {
      updateHeartDisplay(maleHeart, maleHeartRate, maleAvgHR, maleAvgVO2, 'm');
    }
    
    if ((selectedSex === '1' || selectedSex === 'Both') && femaleHeart && femaleHeartRate) {
      updateHeartDisplay(femaleHeart, femaleHeartRate, femaleAvgHR, femaleAvgVO2, 'f');
    }
}

// Add this helper function for efficient heart updates
function updateHeartDisplay(heart, rateElement, avgHR, avgVO2, gender) {
  // Get gradient element
  const gradient = document.querySelector(`#oxygen-gradient-${gender}`);
  if (!gradient) return;
  
  // Calculate color intensity based on speed - only calculate once
  const colorIntensity = Math.min(100, selectedSpeed * 10);
  const startColor = `rgb(255, ${Math.max(0, 155 - colorIntensity)}, ${Math.max(0, 155 - colorIntensity)})`;
  const endColor = `rgb(180, ${Math.max(0, 55 - colorIntensity/2)}, ${Math.max(0, 55 - colorIntensity/2)})`;
  
  // Update gradient colors
  const startStop = gradient.querySelector('stop:first-child');
  const endStop = gradient.querySelector('stop:last-child');
  if (startStop) startStop.setAttribute('stop-color', startColor);
  if (endStop) endStop.setAttribute('stop-color', endColor);
  
  // Update heart size based on speed
  heart.setAttribute('width', 40 + (selectedSpeed - 5) * 5);
  heart.setAttribute('height', 40 + (selectedSpeed - 5) * 5);
  
  // Apply heartbeat animation
  const beatDuration = Math.max(0.5, 1.2 - (selectedSpeed - 5) * 0.15);
  heart.style.animation = `heartbeat ${beatDuration}s infinite ease-in-out`;
  
  // Update particle attributes - minimize DOM operations
  const particles = heart.querySelectorAll('.oxygen-particle');
  const particleOpacity = selectedSpeed >= 8 ? '0.9' : '0.7';
  const particleRadius = selectedSpeed >= 8 ? '2.5' : '2';
  
  particles.forEach(particle => {
    if (particle.getAttribute('opacity') !== particleOpacity) {
      particle.setAttribute('opacity', particleOpacity);
    }
    if (particle.getAttribute('r') !== particleRadius) {
      particle.setAttribute('r', particleRadius);
    }
  });
  
  // Update the heart rate display
  rateElement.textContent = `${avgHR || 'N/A'} BPM / VO₂: ${avgVO2 || 'N/A'}`;
  
  // Set color based on heart rate - only change if needed
  let newColor;
  if (avgHR > 160) newColor = '#ff0000';
  else if (avgHR > 130) newColor = '#ff5500';
  else newColor = '#d30000';
  
  if (rateElement.style.color !== newColor) {
    rateElement.style.color = newColor;
  }
}

// Enhanced function for applying filters
function enhancedApplyCombinedFilter(sex) {
  selectedSex = sex;
  
  // Use cached data
  filteredData = getFilteredData(sex, selectedSpeed);

  // Update which average displays are visible
  if (sex === 'Both') {
    document.getElementById('overall-average-container').style.display = 'block';
    document.getElementById('male-average-container').style.display = 'block';
    document.getElementById('female-average-container').style.display = 'block';
  } else if (sex === '0') {
    document.getElementById('overall-average-container').style.display = 'none';
    document.getElementById('male-average-container').style.display = 'block';
    document.getElementById('female-average-container').style.display = 'none';
  } else if (sex === '1') {
    document.getElementById('overall-average-container').style.display = 'none';
    document.getElementById('male-average-container').style.display = 'none';
    document.getElementById('female-average-container').style.display = 'block';
  }

  // Update selection text
  updateSelectionText();
  
  // Build chart with enhanced version - use requestAnimationFrame for smoother rendering
  window.requestAnimationFrame(() => {
    enhancedBuildChart();
    window.requestAnimationFrame(() => {
      enhancedRunnerAnimation();
    });
  });
}

// Enhanced runner animation function
function enhancedRunnerAnimation() {
  runnerMan.classList.remove('running-slow', 'running-medium', 'running-fast', 'running-max');
  runnerWoman.classList.remove('running-slow', 'running-medium', 'running-fast', 'running-max');

  // Remove old heart classes - we'll control hearts with the new function
  heartContainerMan.style.display = "none";
  heartContainerWoman.style.display = "none";

  if (selectedSex === '0' || selectedSex === 'Both') {
    heartContainerMan.style.display = "block";
  }

  if (selectedSex === '1' || selectedSex === 'Both') {
    heartContainerWoman.style.display = "block";
  }

  if (selectedSex === '0' || selectedSex === 'Both') {
    if (selectedSpeed == 5) runnerMan.classList.add('running-slow');
    if (selectedSpeed == 6) runnerMan.classList.add('running-medium');
    if (selectedSpeed == 7) runnerMan.classList.add('running-fast');
    if (selectedSpeed >= 8) runnerMan.classList.add('running-max');
  }

  if (selectedSex === '1' || selectedSex === 'Both') {
    if (selectedSpeed == 5) runnerWoman.classList.add('running-slow');
    if (selectedSpeed == 6) runnerWoman.classList.add('running-medium');
    if (selectedSpeed == 7) runnerWoman.classList.add('running-fast');
    if (selectedSpeed >= 8) runnerWoman.classList.add('running-max');
  }
  
  // Now call the enhanced heart visualization function
  enhancedHeartVisualization();
}

// Enhanced event listeners for speed filter buttons
function enhancedSpeedButtonListeners() {
  const buttons = document.querySelectorAll('button[data-speed]');
  
  buttons.forEach(function(button) {
    button.addEventListener('click', function() {
      // Clear active class from all buttons
      buttons.forEach(function(btn) {
        btn.classList.remove('active');
      });
      
      // If clicking the same button, toggle it off
      if (selectedSpeed === Number(button.getAttribute('data-speed'))) {
        selectedSpeed = null;
      } else {
        selectedSpeed = Number(button.getAttribute('data-speed')); // Get selected speed
        button.classList.add('active'); // Add active class to the selected button
      }
      
      console.log('Speed selected:', selectedSpeed);
      enhancedApplyCombinedFilter(selectedSex); // Maintain current sex filter when changing speed
    });
  });
}

// Legacy function kept for compatibility
function buildChart() {
  enhancedBuildChart();
}

// Legacy function kept for compatibility
function processAndDisplayGroups(svg, xScale, yScale, width, marginRight, marginTop) {
  processAndDisplaySmootherGroups(svg, xScale, yScale, width, marginRight, marginTop);
}

// Legacy function kept for compatibility
function updateLegend(legend, groupKey, xOffset, yOffset) {
  updateEnhancedLegend(legend, groupKey, xOffset, yOffset);
}

// Legacy function kept for compatibility
function applyCombinedFilter(sex) {
  enhancedApplyCombinedFilter(sex);
}

// Legacy function kept for compatibility
function updateRunnerAnimation() {
  enhancedRunnerAnimation();
}

// Legacy function kept for compatibility
function updateHeartVisualization() {
  enhancedHeartVisualization();
}

// Replace your current DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
  // Set up basic UI structure first
  setupBasicUI();
  
  // Load data with a small delay to allow UI to render
  setTimeout(async function() {
    const success = await loadData();
    if (success) {
      // First render a minimal chart for immediate feedback
      renderSimplifiedChart();
      
      // Add event listeners
      enhancedSpeedButtonListeners();
      enhancedSexButtonListeners();
      
      // Update selection text initially
      updateSelectionText();
      
      // After a short delay, render the full interactive chart
      setTimeout(function() {
        enhancedBuildChart();
        enhancedRunnerAnimation();
      }, 100);
    }
  }, 50);
});

// Add this new function to set up basic UI elements before data loads
function setupBasicUI() {
  // Prepare chart container
  const chartContainer = document.getElementById('line-graph');
  if (chartContainer) {
    chartContainer.innerHTML = '<svg width="928" height="500"></svg>';
    
    // Add placeholder loading message
    const svg = d3.select('#line-graph svg');
    svg.append("text")
      .attr("x", 464)
      .attr("y", 250)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#999")
      .text("Preparing visualization...");
  }
  
  // Set initial states for controls
  const maleButton = document.getElementById('maleButton');
  if (maleButton) maleButton.classList.add('active');
}

// Add this function to show a minimal chart right away
function renderSimplifiedChart() {
  const svg = d3.select('#line-graph svg');
  svg.selectAll('*').remove();
  
  // Basic dimensions
  const width = 928;
  const height = 500;
  const marginTop = 30;
  const marginRight = 100;
  const marginBottom = 50;
  const marginLeft = 70;
  
  // Draw placeholders instead of actual data
  svg.append("rect")
    .attr("width", width - marginLeft - marginRight)
    .attr("height", height - marginTop - marginBottom)
    .attr("x", marginLeft)
    .attr("y", marginTop)
    .attr("fill", "#f8f9fa")
    .attr("rx", 8);
  
  // Draw axes placeholders
  svg.append("line")
    .attr("x1", marginLeft)
    .attr("y1", height - marginBottom)
    .attr("x2", width - marginRight)
    .attr("y2", height - marginBottom)
    .attr("stroke", "#555")
    .attr("stroke-width", 1);
    
  svg.append("line")
    .attr("x1", marginLeft)
    .attr("y1", marginTop)
    .attr("x2", marginLeft)
    .attr("y2", height - marginBottom)
    .attr("stroke", "#555")
    .attr("stroke-width", 1);
    
  // Add labels with improved styling
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '500')
    .attr('fill', '#555')
    .text('Time (seconds)');

  svg.append('text')
    .attr('x', -height / 2)
    .attr('y', 25)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', '500')
    .attr('fill', '#555')
    .text('VO₂ (mL/kg/min)');
}

// Create a data cache object at the top of your file
const dataCache = {
  male: [],
  female: [],
  speeds: {},
  averages: {}
};

// Add this function to precalculate and cache expensive operations
function getFilteredData(sex, speed) {
  // Create cache key
  const cacheKey = `${sex}_${speed}`;
  
  // Use cached data if available
  if (dataCache[cacheKey]) {
    return dataCache[cacheKey];
  }
  
  // Otherwise filter and cache
  let result;
  if (sex === '0' && speed === null) {
    result = dataCache.male;
  } else if (sex === '1' && speed === null) {
    result = dataCache.female;
  } else if (speed !== null && sex !== 'Both') {
    result = dataCache.speeds[speed]?.[sex === '0' ? 'male' : 'female'] || 
      data.filter(d => d.Sex === sex && d.Speed === speed);
  } else if (speed !== null) {
    result = dataCache.speeds[speed]?.all || 
      data.filter(d => d.Speed === speed);
  } else {
    // Both sexes, all speeds
    result = data;
  }
  
  // Cache for future use
  dataCache[cacheKey] = result;
  return result;
}

// Modify enhancedApplyCombinedFilter to use the cache
function enhancedApplyCombinedFilter(sex) {
  selectedSex = sex;
  
  // Use cached data
  filteredData = getFilteredData(sex, selectedSpeed);

  // Update which average displays are visible
  if (sex === 'Both') {
    document.getElementById('overall-average-container').style.display = 'block';
    document.getElementById('male-average-container').style.display = 'block';
    document.getElementById('female-average-container').style.display = 'block';
  } else if (sex === '0') {
    document.getElementById('overall-average-container').style.display = 'none';
    document.getElementById('male-average-container').style.display = 'block';
    document.getElementById('female-average-container').style.display = 'none';
  } else if (sex === '1') {
    document.getElementById('overall-average-container').style.display = 'none';
    document.getElementById('male-average-container').style.display = 'none';
    document.getElementById('female-average-container').style.display = 'block';
  }

  // Update selection text
  updateSelectionText();
  
  // Build chart with enhanced version - use requestAnimationFrame for smoother rendering
  window.requestAnimationFrame(() => {
    enhancedBuildChart();
    window.requestAnimationFrame(() => {
      enhancedRunnerAnimation();
    });
  });
}

