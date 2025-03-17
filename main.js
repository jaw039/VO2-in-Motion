// Variables to track current selection (for display purposes)
let currentSelectionText = "Male, All speeds";
let data = [];
let subjectInfo = [];
let filteredData = [];
let measureData = [];
let selectedSpeed = null;
let showAverage = true; // Set to true by default
let selectedSex = '0';  // Default to male ('0')

// Initialize data cache properly
const dataCache = {
  male: [],
  female: [],
  speeds: {},
  averages: {}
};

// DOM elements - initialize as null and find them after document loads
let runnerMan = null;
let runnerWoman = null;
let heartMan = null;
let heartWoman = null;
let heartContainerMan = null;
let heartContainerWoman = null;
const treadmillElements = document.querySelectorAll('.treadmill');

// Fix the updateSelectionText function
function updateSelectionText() {
    const sexText = selectedSex === '0' ? 'Male' : (selectedSex === '1' ? 'Female' : 'Both');
    const speedText = selectedSpeed ? `Speed ${selectedSpeed}` : 'All speeds';
    currentSelectionText = `${sexText}, ${speedText}`; // Fixed template string
    
    // Update the text in the UI
    const selectionElement = document.getElementById('current-selection');
    if (selectionElement) {
        selectionElement.textContent = currentSelectionText;
    }
}

// Helper function for heart display updates
function updateHeartDisplay(heart, rateElement, avgHR, avgVO2, gender) {
    try {
        // Get gradient element
        const gradient = document.querySelector(`#oxygen-gradient-${gender}`);
        if (!gradient) {
            console.warn(`Gradient #oxygen-gradient-${gender} not found`);
            return;
        }
        
        // Calculate color intensity based on speed
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
    } catch (error) {
        console.error("Error updating heart display:", error);
    }
}

// Function to get cached filtered data
function getFilteredData(sex, speed) {
    try {
        // Create cache key
        const cacheKey = `${sex}_${speed}`;
        
        // Use cached data if available
        if (dataCache[cacheKey]) {
            return dataCache[cacheKey];
        }
        
        // Otherwise filter and cache
        let result;
        if (sex === '0' && speed === null) {
            result = dataCache.male || [];
        } else if (sex === '1' && speed === null) {
            result = dataCache.female || [];
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
    } catch (error) {
        console.error("Error getting filtered data:", error);
        return [];
    }
}

// Enhanced function for applying filters - Fixed doubled function keyword
function enhancedApplyCombinedFilter(sex) {
    try {
        selectedSex = sex;
        
        // Use cached data
        filteredData = getFilteredData(sex, selectedSpeed);

        // Update which average displays are visible
        const overallContainer = document.getElementById('overall-average-container');
        const maleContainer = document.getElementById('male-average-container');
        const femaleContainer = document.getElementById('female-average-container');
        
        if (overallContainer && maleContainer && femaleContainer) {
            if (sex === 'Both') {
                overallContainer.style.display = 'block';
                maleContainer.style.display = 'block';
                femaleContainer.style.display = 'block';
            } else if (sex === '0') {
                overallContainer.style.display = 'none';
                maleContainer.style.display = 'block';
                femaleContainer.style.display = 'none';
            } else if (sex === '1') {
                overallContainer.style.display = 'none';
                maleContainer.style.display = 'none';
                femaleContainer.style.display = 'block';
            }
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
    } catch (error) {
        console.error("Error applying filter:", error);
    }
}

function updateTreadmillSpeed(speed) {
    treadmillElements.forEach(treadmill => {
        treadmill.classList.remove('speed-5', 'speed-6', 'speed-7', 'speed-8', 'speed-9');
        if (speed) {
            treadmill.classList.add(`speed-${speed}`);
        }
    });

    const speedFactor = speed ? 5 / speed : 1;
    runnerMan.style.animationDuration = `${speedFactor}s`;
    runnerWoman.style.animationDuration = `${speedFactor}s`;
}

function enhancedSpeedButtonListeners() {
    try {
        const speedSlider = document.getElementById('speed-slider');
        if (!speedSlider) {
            console.error("Speed slider not found");
            return;
        }
        setupSpeedSlider();
    } catch (error) {
        console.error("Error setting up speed button listeners:", error);
    }
}
// Fixed enhancedRunnerAnimation function
function enhancedRunnerAnimation() {
    try {
        // Make sure DOM elements exist
        if (!runnerMan || !runnerWoman || !heartContainerMan || !heartContainerWoman) {
            console.warn("Runner animation elements not found");
            return;
        }
        
        // Remove all animation classes first
        runnerMan.classList.remove('running-slow', 'running-medium', 'running-fast', 'running-max');
        runnerWoman.classList.remove('running-slow', 'running-medium', 'running-fast', 'running-max');

        // Hide heart containers by default
        heartContainerMan.style.display = "none";
        heartContainerWoman.style.display = "none";

        // Show appropriate heart containers based on selection
        if (selectedSex === '0' || selectedSex === 'Both') {
            heartContainerMan.style.display = "block";
        }

        if (selectedSex === '1' || selectedSex === 'Both') {
            heartContainerWoman.style.display = "block";
        }

        // Add appropriate running class based on speed
        if (selectedSex === '0' || selectedSex === 'Both') {
            if (selectedSpeed == 5) runnerMan.classList.add('running-slow');
            else if (selectedSpeed == 6) runnerMan.classList.add('running-medium');
            else if (selectedSpeed == 7) runnerMan.classList.add('running-fast');
            else if (selectedSpeed >= 8) runnerMan.classList.add('running-max');
        }

        if (selectedSex === '1' || selectedSex === 'Both') {
            if (selectedSpeed == 5) runnerWoman.classList.add('running-slow');
            else if (selectedSpeed == 6) runnerWoman.classList.add('running-medium');
            else if (selectedSpeed == 7) runnerWoman.classList.add('running-fast');
            else if (selectedSpeed >= 8) runnerWoman.classList.add('running-max');
        }
        
        // Now call the enhanced heart visualization function
        enhancedHeartVisualization();
    } catch (error) {
        console.error("Error animating runners:", error);
    }
}

// Fix enhancedHeartVisualization function
function enhancedHeartVisualization() {
    try {
        // Skip if no speed is selected
        if (!selectedSpeed) return;
        
        // Get heart elements
        const maleHeart = document.getElementById('heart-m');
        const femaleHeart = document.getElementById('heart-f');
        const maleHeartRate = document.getElementById('heart-rate-m');
        const femaleHeartRate = document.getElementById('heart-rate-f');
        
        if (!maleHeart || !femaleHeart || !maleHeartRate || !femaleHeartRate) {
            console.warn("Heart elements not found in the DOM");
            return;
        }
        
        // Create cache key for heart rate and VO2 calculations
        const cacheKey = `heart_${selectedSpeed}`;
        
        // Initialize averages object if not exists
        if (!dataCache.averages) dataCache.averages = {};
        
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
    } catch (error) {
        console.error("Error updating heart visualization:", error);
    }
}

// Enhanced event listeners for sex filter buttons
function enhancedSexButtonListeners() {
    try {
        const maleButton = document.getElementById('maleButton');
        const femaleButton = document.getElementById('femaleButton');
        const bothButton = document.getElementById('bothButton');
        
        if (!maleButton || !femaleButton || !bothButton) {
            console.error("Sex filter buttons not found");
            return;
        }

        // Set default active state for male button
        maleButton.classList.add('active');
        
        // Clear previous event listeners if any
        const newMaleButton = maleButton.cloneNode(true);
        const newFemaleButton = femaleButton.cloneNode(true);
        const newBothButton = bothButton.cloneNode(true);
        
        maleButton.parentNode.replaceChild(newMaleButton, maleButton);
        femaleButton.parentNode.replaceChild(newFemaleButton, femaleButton);
        bothButton.parentNode.replaceChild(newBothButton, bothButton);
        
        // Add event listeners to new buttons
        newMaleButton.addEventListener('click', function() {
            newMaleButton.classList.add('active');
            newFemaleButton.classList.remove('active');
            newBothButton.classList.remove('active');
            enhancedApplyCombinedFilter('0');
        });
        
        newFemaleButton.addEventListener('click', function() {
            newMaleButton.classList.remove('active');
            newFemaleButton.classList.add('active');
            newBothButton.classList.remove('active');
            enhancedApplyCombinedFilter('1');
        });
        
        newBothButton.addEventListener('click', function() {
            newMaleButton.classList.remove('active');
            newFemaleButton.classList.remove('active');
            newBothButton.classList.add('active');
            enhancedApplyCombinedFilter('Both');
        });
    } catch (error) {
        console.error("Error setting up sex button listeners:", error);
    }
}

function setupSpeedSlider() {
    try {
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        
        if (!speedSlider || !speedValue) {
            console.error("Speed slider or value display not found");
            return;
        }
        
        // Initialize with the current slider value
        selectedSpeed = parseInt(speedSlider.value);
        speedValue.textContent = selectedSpeed;
        
        // Add event listener for slider changes
        speedSlider.addEventListener('input', function() {
            // Update the displayed value while dragging
            speedValue.textContent = this.value;
        });
        
        speedSlider.addEventListener('change', function() {
            // When slider is released, update the selected speed
            selectedSpeed = parseInt(this.value);
            speedValue.textContent = selectedSpeed;
            
            // Update the current selection text
            updateSelectionText();
            
            // Apply the filter with the new speed
            enhancedApplyCombinedFilter(selectedSex);
            
            // Update the treadmill animation speed
            updateTreadmillSpeed(selectedSpeed);
        });
        
        console.log("Speed slider set up successfully");
    } catch (error) {
        console.error("Error setting up speed slider:", error);
    }
}


// Add this new function to set up basic UI elements before data loads
function setupBasicUI() {
    try {
        // Prepare chart container
        const chartContainer = document.getElementById('line-graph');
        if (chartContainer) {
            // Make sure there's not already an SVG inside
            if (chartContainer.tagName !== 'svg' && chartContainer.innerHTML.trim() === '') {
                const width = 928;
                const height = 500;
                
                chartContainer.setAttribute("width", width);
                chartContainer.setAttribute("height", height);
                chartContainer.setAttribute("viewBox", `0 0 ${width} ${height}`);
                
                // Add placeholder loading message
                const svg = d3.select('#line-graph');
                svg.append("text")
                    .attr("x", width / 2)
                    .attr("y", height / 2)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "16px")
                    .attr("fill", "#999")
                    .text("Loading visualization...");
            }
        }
        
        // Set initial states for controls
        const maleButton = document.getElementById('maleButton');
        if (maleButton) maleButton.classList.add('active');
    } catch (error) {
        console.error("Error setting up basic UI:", error);
    }
}

// Add this function to show a minimal chart right away
function renderSimplifiedChart() {
    try {
        const svg = d3.select('#line-graph');
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
    } catch (error) {
        console.error("Error rendering simplified chart:", error);
    }
}

// Replace DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing visualization");
    
    try {
        // Initialize DOM elements first
        runnerMan = document.getElementById('runner-m');
        runnerWoman = document.getElementById('runner-f');
        heartMan = document.getElementById('heart-m');
        heartWoman = document.getElementById('heart-f');
        heartContainerMan = document.getElementById('heart-container-m');
        heartContainerWoman = document.getElementById('heart-container-f');
        
        // Set up basic UI structure
        setupBasicUI();
        
        // Load data with a small delay to allow UI to render
        setTimeout(async function() {
            try {
                const success = await loadData();
                if (success) {
                    console.log("Data loaded successfully");
                    renderSimplifiedChart();
                    enhancedSpeedButtonListeners();
                    enhancedSexButtonListeners();
                    updateSelectionText();
                    
                    setTimeout(function() {
                        enhancedBuildChart();
                        enhancedRunnerAnimation();
                        updateTreadmillSpeed(5);
                    }, 100);
                } else {
                    console.error("Failed to load data");
                }
            } catch (error) {
                console.error("Error in data loading process:", error);
            }
        }, 50);
    } catch (error) {
        console.error("Error in DOMContentLoaded handler:", error);
    }
});

// Sample data for testing when CSV files aren't available
function generateSampleData() {
    console.log("Using sample data for testing");
    
    // Generate sample subject info
    const sampleSubjects = [];
    for (let i = 1; i <= 20; i++) {
        sampleSubjects.push({
            ID: i,
            Sex: i % 2 === 0 ? '1' : '0' // Alternate between male (0) and female (1)
        });
    }
    
    // Generate sample measurements
    const sampleMeasurements = [];
    for (let i = 1; i <= 20; i++) { // For each subject
        for (let speed = 5; speed <= 9; speed++) { // For each speed
            for (let time = 0; time <= 900; time += 30) { // Time points every 30 seconds up to 15 minutes
                // Calculate VO2 with some variation
                // Males have higher values than females
                const baseLine = speed * 5; // Base VO2 depends on speed
                const genderFactor = sampleSubjects[i-1].Sex === '0' ? 1.2 : 0.9; // Males have higher values
                const noise = (Math.random() - 0.5) * 5; // Add some random variation
                const vo2 = baseLine * genderFactor + noise;
                
                // Heart rate also varies with speed and gender
                const baseHR = 70 + speed * 12;
                const hrNoise = (Math.random() - 0.5) * 8;
                const hr = baseHR + hrNoise;
                
                sampleMeasurements.push({
                    ID: i,
                    time: time,
                    Speed: speed,
                    VO2: vo2,
                    HR: hr,
                    Sex: sampleSubjects[i-1].Sex
                });
            }
        }
    }
    
    return { subjectInfo: sampleSubjects, measureData: sampleMeasurements };
}

// Optimized loadData function
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
        let subjectInfo = [];
        let measureData = [];
        
        try {
            // Try to load real data
            loadingIndicator.textContent = 'Loading demographic data...';
            subjectInfo = await d3.csv('subject-info-cleaned.csv', function(row) {
                return {
                    ID: +row.ID,
                    Sex: row.Sex
                };
            });
            
            loadingIndicator.textContent = 'Loading measurement data...';
            measureData = await d3.csv('test_measure-cleaned.csv', function(row) {
                return {
                    time: +row.time,
                    Speed: +row.Speed,
                    HR: +row.HR || null,
                    VO2: +row.VO2,
                    ID: +row.ID
                };
            });
        } catch (error) {
            console.warn("Could not load CSV files, using sample data instead.", error);
            // Generate sample data if files can't be loaded
            const sampleData = generateSampleData();
            subjectInfo = sampleData.subjectInfo;
            measureData = sampleData.measureData;
        }
        
        // If we have subject info but not linked to measure data yet
        if (measureData.length > 0 && (!measureData[0].Sex || measureData[0].Sex === undefined)) {
            const subjectLookup = {};
            subjectInfo.forEach(function(subject) {
                subjectLookup[subject.ID] = subject.Sex;
            });
            
            // Add Sex to measurement data
            measureData = measureData.map(d => ({
                ...d,
                Sex: subjectLookup[d.ID] || (d.ID % 2 === 0 ? '1' : '0') // Fallback pattern if lookup fails
            }));
        }
        
        // Store complete data
        data = measureData;
        
        // Pre-filter for common cases and cache results
        dataCache.male = data.filter(d => d.Sex === '0');
        dataCache.female = data.filter(d => d.Sex === '1');
        dataCache.speeds = {};
        dataCache.averages = {};
        
        // Pre-calculate common speed filters
        [5, 6, 7, 8, 9].forEach(speed => {
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
        loadingIndicator.textContent = "Error loading data. Using sample data.";
        
        // Generate sample data as a fallback
        const sampleData = generateSampleData();
        subjectInfo = sampleData.subjectInfo;
        data = sampleData.measureData;
        
        // Fill cache with sample data
        dataCache.male = data.filter(d => d.Sex === '0');
        dataCache.female = data.filter(d => d.Sex === '1');
        dataCache.speeds = {};
        dataCache.averages = {};
        
        [5, 6, 7, 8, 9].forEach(speed => {
            dataCache.speeds[speed] = {
                all: data.filter(d => d.Speed === speed),
                male: data.filter(d => d.Sex === '0' && d.Speed === speed),
                female: data.filter(d => d.Sex === '1' && d.Speed === speed)
            };
        });
        
        filteredData = dataCache.male;
        
        // Remove loading indicator after a delay
        setTimeout(() => {
            if (container.contains(loadingIndicator)) {
                container.removeChild(loadingIndicator);
            }
        }, 2000);
        
        return true;
    }
}

// Calculate average VO2 values by time for a given dataset
function calculateAveragesByTime(dataToAverage) {
    if (!dataToAverage || dataToAverage.length === 0) {
        console.warn("No data to average");
        return [];
    }
    
    try {
        // Group by time
        const groupedByTime = d3.group(dataToAverage, function(d) { return d.time; });
        
        // Calculate average VO2 for each time point
        const averages = Array.from(groupedByTime, function([time, values]) {
            return {
                time: +time,
                VO2: d3.mean(values, function(d) { return d.VO2; }),
                Sex: dataToAverage[0].Sex,
                Speed: dataToAverage[0].Speed
            };
        }).sort(function(a, b) { return a.time - b.time; });
        
        return averages;
    } catch (error) {
        console.error("Error calculating averages:", error);
        return [];
    }
}

// Fixed enhancedBuildChart function that doesn't add scatter points
function enhancedBuildChart() {
    // Check if we have data
    if (!filteredData || filteredData.length === 0) {
        console.warn("No data to display in chart");
        return;
    }
    
    try {
        // Clear existing chart
        d3.select('#line-graph').selectAll('*').remove();

        // Setting dimensions for svg
        const width = 928;
        const height = 500;
        const marginTop = 30;
        const marginRight = 100;
        const marginBottom = 50;
        const marginLeft = 70;

        const svg = d3.select('#line-graph')
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto; -webkit-tap-highlight-color: transparent;");

        // Add a nicer background with gradient
        const defs = svg.append("defs");
        const bgGradient = defs.append("linearGradient")
            .attr("id", "bg-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");
            
        bgGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#f9f9f9");
            
        bgGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#f0f0f0");

        // Add background with gradient and improved styling
        svg.append("rect")
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("fill", "url(#bg-gradient)")
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("stroke", "#e0e0e0")
            .attr("stroke-width", 1);

        // Define scales with appropriate domains - with error handling
        const xExtent = d3.extent(filteredData, d => d.time);
        const xMin = xExtent[0] || 0;
        const xMax = xExtent[1] || 100;
        
        const yMax = d3.max(filteredData, d => d.VO2) || 50;
        
        const xScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([marginLeft, width - marginRight]);

        const yScale = d3.scaleLinear()
            .domain([0, yMax * 1.1])
            .range([height - marginBottom, marginTop]);
            
        // Adding grid lines for better readability with improved styling
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${height - marginBottom})`)
            .call(
                d3.axisBottom(xScale)
                    .tickSize(-(height - marginTop - marginBottom))
                    .tickFormat('')
            )
            .attr('opacity', 0.15)
            .attr('stroke', '#555')
            .attr('stroke-dasharray', '2,2');
        
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(${marginLeft}, 0)`)
            .call(
                d3.axisLeft(yScale)
                    .tickSize(-(width - marginLeft - marginRight))
                    .tickFormat('')
            )
            .attr('opacity', 0.15)
            .attr('stroke', '#555')
            .attr('stroke-dasharray', '2,2');

        // Adding X and Y axis with improved styling
        const xAxis = d3.axisBottom(xScale)
            .tickPadding(10)
            .tickSize(5)
            .ticks(10);
            
        const yAxis = d3.axisLeft(yScale)
            .tickPadding(10)
            .tickSize(5)
            .ticks(10);

        svg.append('g')
            .attr('transform', `translate(0, ${height - marginBottom})`)
            .call(xAxis)
            .attr('font-family', 'Segoe UI, sans-serif')
            .attr('font-size', '12px')
            .attr('color', '#555');

        svg.append('g')
            .attr('transform', `translate(${marginLeft}, 0)`)
            .call(yAxis)
            .attr('font-family', 'Segoe UI, sans-serif')
            .attr('font-size', '12px')
            .attr('color', '#555');

        // Add labels with improved styling
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '500')
            .attr('fill', '#333')
            .text('Time (seconds)');

        svg.append('text')
            .attr('x', -height / 2)
            .attr('y', 18)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '500')
            .attr('fill', '#333')
            .text('VO₂ (mL/kg/min)');

        // Add subtitle based on current selection
        const speedText = selectedSpeed ? `at Speed ${selectedSpeed}` : 'across all speeds';
        const genderText = selectedSex === 'Both' ? 'comparing males and females' : 
                          (selectedSex === '0' ? 'for males' : 'for females');
        
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', marginTop - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '13px')
            .attr('font-style', 'italic')
            .attr('fill', '#555')
            .text(`VO₂ consumption ${speedText} ${genderText}`);

        // Process and display the data with smoother lines
        processAndDisplaySmootherGroups(svg, xScale, yScale, width, marginRight, marginTop);

        // FIX: Create a new brush group and ensure it's properly initialized
        const brushG = svg.append("g")
        .attr("class", "brush");

        
        // Define the brush function with a proper handler
        const brush = d3.brushX()
        .extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]])
        .on("end", brushed);
        
        // Apply the brush to the group
        brushG.call(brush);
        
        // Style the brush selections
        svg.selectAll(".selection")
        .attr("fill", "#3498db")
        .attr("fill-opacity", 0.15)
        .attr("stroke", "#2980b9")
        .attr("stroke-width", 1.5);

        // Add tooltip for interactive data exploration with improved styling
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "rgba(255, 255, 255, 0.95)")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("box-shadow", "0 3px 14px rgba(0,0,0,0.15), 0 1px 5px rgba(0,0,0,0.1)")
            .style("pointer-events", "none")
            .style("font-size", "14px")
            .style("font-family", "Segoe UI, sans-serif")
            .style("max-width", "220px")
            .style("z-index", "10")
            .style("border", "1px solid #e0e0e0");
        
        // Add crosshair guide for hover
        const verticalGuide = svg.append("line")
            .attr("class", "guide")
            .attr("stroke", "#555")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0);
            
        const horizontalGuide = svg.append("line")
            .attr("class", "guide")
            .attr("stroke", "#555")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0);
            
        // Add hover area for better interaction
        svg.append("rect")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("fill", "transparent")
            .on("mousemove", function(event) {
                const [mouseX, mouseY] = d3.pointer(event);
                
                // Only show guides if within chart area
                if (mouseX >= marginLeft && mouseX <= width - marginRight && 
                    mouseY >= marginTop && mouseY <= height - marginBottom) {
                    
                    // Update crosshair position
                    verticalGuide
                        .attr("x1", mouseX)
                        .attr("y1", marginTop)
                        .attr("x2", mouseX)
                        .attr("y2", height - marginBottom)
                        .attr("opacity", 0.5);
                        
                    horizontalGuide
                        .attr("x1", marginLeft)
                        .attr("y1", mouseY)
                        .attr("x2", width - marginRight)
                        .attr("y2", mouseY)
                        .attr("opacity", 0.5);
                        
                    // Get data at current position
                    const timeValue = xScale.invert(mouseX);
                    
                    // Find closest data points
                    let malePoint = null;
                    let femalePoint = null;
                    
                    // Use cached data by sex
                    const maleData = dataCache.male;
                    const femaleData = dataCache.female;
                    
                    if (maleData && maleData.length > 0) {
                        malePoint = maleData.reduce((closest, current) => {
                            return Math.abs(current.time - timeValue) < Math.abs(closest.time - timeValue) ? current : closest;
                        });
                    }
                    
                    if (femaleData && femaleData.length > 0) {
                        femalePoint = femaleData.reduce((closest, current) => {
                            return Math.abs(current.time - timeValue) < Math.abs(closest.time - timeValue) ? current : closest;
                        });
                    }
                    
                    // Build tooltip content
                    let tooltipContent = `<strong>Time:</strong> ${Math.round(timeValue)}s<br>`;
                    
                    if (selectedSex === '0' || selectedSex === 'Both') {
                        tooltipContent += `<span style="color: #3498db;"><strong>Male VO₂:</strong> ${malePoint ? malePoint.VO2.toFixed(1) : 'N/A'}</span><br>`;
                    }
                    
                    if (selectedSex === '1' || selectedSex === 'Both') {
                        tooltipContent += `<span style="color: #e84393;"><strong>Female VO₂:</strong> ${femalePoint ? femalePoint.VO2.toFixed(1) : 'N/A'}</span>`;
                    }
                    
                    if (selectedSex === 'Both' && malePoint && femalePoint) {
                        const difference = malePoint.VO2 - femalePoint.VO2;
                        tooltipContent += `<br><span style="color: #555;"><strong>Difference:</strong> ${Math.abs(difference).toFixed(1)} (${difference > 0 ? 'M>F' : 'F>M'})</span>`;
                    }
                    
                    // Show tooltip
                    tooltip.transition()
                        .duration(100)
                        .style("opacity", 0.95);
                        
                    tooltip.html(tooltipContent)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 30) + "px");
                }
            })
            .on("mouseout", function() {
                // Hide guides and tooltip
                verticalGuide.attr("opacity", 0);
                horizontalGuide.attr("opacity", 0);
                
                tooltip.transition()
                    .duration(300)
                    .style("opacity", 0);
            });
            function brushed(event) {
    // Check if selection exists (user dragged) or if it was just a click (selection is null)
    if (event.selection) {
        const [x0, x1] = event.selection.map(xScale.invert);
        
        // Get data within the selected time range
        const filtered = filteredData.filter(d => d.time >= x0 && d.time <= x1);
        
        // Calculate averages based on selected sex filter
        if (selectedSex === 'Both') {
            // Calculate overall average VO2
            const averageVO2 = d3.mean(filtered, d => d.VO2);
            document.getElementById('average-vo2-value').textContent = 
                !isNaN(averageVO2) ? averageVO2.toFixed(2) : "N/A";
            
            // Calculate male average
            const maleFiltered = filtered.filter(d => d.Sex === '0');
            const maleAverageVO2 = d3.mean(maleFiltered, d => d.VO2);
            document.getElementById('male-vo2-value').textContent = 
                !isNaN(maleAverageVO2) ? maleAverageVO2.toFixed(2) : "N/A";
            
            // Calculate female average
            const femaleFiltered = filtered.filter(d => d.Sex === '1');
            const femaleAverageVO2 = d3.mean(femaleFiltered, d => d.VO2);
            document.getElementById('female-vo2-value').textContent = 
                !isNaN(femaleAverageVO2) ? femaleAverageVO2.toFixed(2) : "N/A";
            
            // Show all average displays
            document.getElementById('overall-average-container').style.display = 'block';
            document.getElementById('male-average-container').style.display = 'block';
            document.getElementById('female-average-container').style.display = 'block';
        } 
        else if (selectedSex === '0') {
            // Only show male average
            const maleAverageVO2 = d3.mean(filtered, d => d.VO2);
            document.getElementById('male-vo2-value').textContent = 
                !isNaN(maleAverageVO2) ? maleAverageVO2.toFixed(2) : "N/A";
            
            // Hide other displays
            document.getElementById('overall-average-container').style.display = 'none';
            document.getElementById('male-average-container').style.display = 'block';
            document.getElementById('female-average-container').style.display = 'none';
        }
        else if (selectedSex === '1') {
            // Only show female average
            const femaleAverageVO2 = d3.mean(filtered, d => d.VO2);
            document.getElementById('female-vo2-value').textContent = 
                !isNaN(femaleAverageVO2) ? femaleAverageVO2.toFixed(2) : "N/A";
            
            // Hide other displays
            document.getElementById('overall-average-container').style.display = 'none';
            document.getElementById('male-average-container').style.display = 'none';
            document.getElementById('female-average-container').style.display = 'block';
        }
        
        // Highlight the brushed region with improved styling
        svg.selectAll(".highlighted-region").remove();
        svg.append("rect")
            .attr("class", "highlighted-region")
            .attr("x", event.selection[0])  // Use event.selection instead of selection
            .attr("y", marginTop)
            .attr("width", event.selection[1] - event.selection[0])  // Use event.selection
            .attr("height", height - marginTop - marginBottom)
            .attr("fill", "#ffeaa7") // Soft yellow fill
            .attr("opacity", 0.25)
            .attr("rx", 4)
            .attr("ry", 4)
            .lower(); // Put behind other elements
            
        // Add label showing the time range selected
        svg.selectAll(".selection-label").remove();
        svg.append("text")
            .attr("class", "selection-label")
            .attr("x", (event.selection[0] + event.selection[1]) / 2)  // Use event.selection
            .attr("y", marginTop + 16)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#666")
            .text(`Selected: ${Math.round(x0)}s - ${Math.round(x1)}s`);
    } else {
        // If user clicked without dragging, clear the brush
        svg.select(".brush").call(brush.move, null);
        
        // Remove highlighted region and labels
        svg.selectAll(".highlighted-region").remove();
        svg.selectAll(".selection-label").remove();
        
        // Reset values to N/A
        const avgElements = document.querySelectorAll('[id$="-vo2-value"]');
        avgElements.forEach(el => {
            el.textContent = "N/A";
        });
    }
        }
    } catch (error) {
        console.error("Error building chart:", error);
    }
}

// New function for displaying smoother line groups
// This file contains only the essential functions needed to fix the graph
// Replace these in your main.js file

// Improved smoothing helper function
function smoothDataPoints(data) {
    if (data.length < 5) return data;
    
    const windowSize = Math.min(10, Math.ceil(data.length / 20));
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize);
        const end = Math.min(data.length - 1, i + windowSize);
        
        let sum = 0;
        let count = 0;
        
        for (let j = start; j <= end; j++) {
            // Weight points closer to the center more heavily
            const weight = 1 - Math.abs(i - j) / (windowSize + 1);
            sum += data[j].VO2 * weight;
            count += weight;
        }
        
        result.push({
            time: data[i].time,
            VO2: sum / count,
            HR: data[i].HR,
            Sex: data[i].Sex,
            Speed: data[i].Speed
        });
    }
    
    return result;
}

// Fixed version of processAndDisplaySmootherGroups function
function processAndDisplaySmootherGroups(svg, xScale, yScale, width, marginRight, marginTop) {
    try {
        // Remove previous legends to ensure they're updated correctly
        svg.selectAll(".legend").remove();

        // Set up the legend with better styling
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + (width - marginRight - 150) + ", " + marginTop + ")");

        // Add a more professional title/caption to the legend
        legend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .text("Gender Comparison");

        // Group data by Sex
        const groups = d3.group(filteredData, function(d) { return d.Sex; });
        let yOffset = 10; // Start legend items a bit lower with space for the title
        
        // Store male and female data for comparison
        let maleData = null;
        let femaleData = null;
        
        // First pass to process and get the data
        groups.forEach(function(groupData, groupKey) {
            // Check if there's any data to show for this group
            if (groupData.length > 0) {
                // Apply speed filter if selected
                if (selectedSpeed !== null) {
                    groupData = groupData.filter(function(d) { return d.Speed === selectedSpeed; });
                }

                // Skip if no data after filtering
                if (groupData.length === 0) return;
                
                // Sort data by time for proper line rendering
                groupData.sort((a, b) => a.time - b.time);
                
                // Remove duplicates at same time point by grouping and averaging
                const timeGroupMap = new Map();
                groupData.forEach(d => {
                    const timeKey = Math.round(d.time);
                    if (!timeGroupMap.has(timeKey)) {
                        timeGroupMap.set(timeKey, []);
                    }
                    timeGroupMap.get(timeKey).push(d);
                });
                
                const dedupedData = [];
                timeGroupMap.forEach((group, timeKey) => {
                    const avgVO2 = d3.mean(group, d => d.VO2);
                    dedupedData.push({
                        time: +timeKey,
                        VO2: avgVO2,
                        Sex: group[0].Sex,
                        Speed: group[0].Speed,
                        HR: d3.mean(group, d => d.HR)
                    });
                });
                
                // Sort again after deduplication
                dedupedData.sort((a, b) => a.time - b.time);
                
                // Apply smoothing with a larger window for extra smoothness
                const smoothedData = smoothDataPoints(dedupedData, 12);

                // Store data by gender for comparison
                if (groupKey === '0') {
                    maleData = smoothedData;
                } else {
                    femaleData = smoothedData;
                }

                // Define a smoother line generator
                const line = d3.line()
                    .x(d => xScale(d.time))
                    .y(d => yScale(d.VO2))
                    .curve(d3.curveMonotoneX); // This creates smoother transitions

                // Add a subtle drop shadow for the path
                const defs = svg.append("defs");
                const filter = defs.append("filter")
                    .attr("id", `shadow-${groupKey}`)
                    .attr("width", "200%")
                    .attr("height", "200%");
                    
                filter.append("feDropShadow")
                    .attr("dx", 0)
                    .attr("dy", 1)
                    .attr("stdDeviation", 2)
                    .attr("flood-opacity", 0.3);

                // Add subtle gradient for the line
                const gradientId = `line-gradient-${groupKey}`;
                const gradient = defs.append("linearGradient")
                    .attr("id", gradientId)
                    .attr("gradientUnits", "userSpaceOnUse")
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", 0)
                    .attr("y2", 1);
                    
                if (groupKey === '0') { // Male
                    gradient.append("stop")
                        .attr("offset", "0%")
                        .attr("stop-color", "#2980b9");
                    gradient.append("stop")
                        .attr("offset", "100%")
                        .attr("stop-color", "#3498db");
                } else { // Female
                    gradient.append("stop")
                        .attr("offset", "0%")
                        .attr("stop-color", "#c2185b");
                    gradient.append("stop")
                        .attr("offset", "100%")
                        .attr("stop-color", "#e84393");
                }

                // Draw line with improved styling and transition
                const path = svg.append('path')
                    .datum(smoothedData)
                    .attr('fill', 'none')
                    .attr('stroke', groupKey === '0' ? '#3498db' : '#e84393')
                    .attr('stroke-width', 4)  // Thicker line
                    .attr('stroke-linejoin', 'round')
                    .attr('stroke-linecap', 'round')
                    .attr('filter', `url(#shadow-${groupKey})`) // Apply shadow
                    .attr('d', line);
                    
                // Add line animation
                const pathLength = path.node().getTotalLength();
                path
                    .attr("stroke-dasharray", pathLength)
                    .attr("stroke-dashoffset", pathLength)
                    .transition()
                    .duration(1000)
                    .ease(d3.easeLinear)
                    .attr("stroke-dashoffset", 0);

                // Update legend with enhanced styling
                updateEnhancedLegend(legend, groupKey, 0, yOffset);
                yOffset += 30; // More space between legend items

                // Add peak annotation with improved styling
                if (selectedSpeed !== null) {
                    const maxPoint = d3.max(smoothedData, d => d.VO2);
                    const maxDataPoint = smoothedData.find(d => d.VO2 === maxPoint);
                    
                    if (maxDataPoint) {
                        // Add circle at max point with pulse animation
                        svg.append("circle")
                            .attr("cx", xScale(maxDataPoint.time))
                            .attr("cy", yScale(maxDataPoint.VO2))
                            .attr("r", 6)
                            .attr("fill", groupKey === '0' ? "#3498db" : "#e84393")
                            .attr("stroke", "white")
                            .attr("stroke-width", 2)
                            .attr("class", "pulse-circle");
                            
                        // Add annotation text with improved styling
                        svg.append("text")
                            .attr("x", xScale(maxDataPoint.time) + 12)
                            .attr("y", yScale(maxDataPoint.VO2) - 12)
                            .attr("text-anchor", "start")
                            .attr("font-size", "12px")
                            .attr("font-weight", "bold")
                            .attr("fill", groupKey === '0' ? "#3498db" : "#e84393")
                            .attr("stroke", "white")
                            .attr("stroke-width", 0.5)
                            .attr("paint-order", "stroke")
                            .text(`Peak: ${maxDataPoint.VO2.toFixed(1)}`);

                        // Add an average line
                        const avgVO2 = d3.mean(smoothedData, d => d.VO2);
                        
                        svg.append("line")
                            .attr("x1", xScale(smoothedData[0].time))
                            .attr("y1", yScale(avgVO2))
                            .attr("x2", xScale(smoothedData[smoothedData.length - 1].time))
                            .attr("y2", yScale(avgVO2))
                            .attr("stroke", groupKey === '0' ? "#3498db" : "#e84393")
                            .attr("stroke-width", 1.5)
                            .attr("stroke-dasharray", "5,5")
                            .attr("opacity", 0.6);
                        
                        // Add average label
                        svg.append("text")
                            .attr("x", xScale(smoothedData[0].time) + 10)
                            .attr("y", yScale(avgVO2) - 8)
                            .attr("text-anchor", "start")
                            .attr("font-size", "11px")
                            .attr("fill", groupKey === '0' ? "#3498db" : "#e84393")
                            .attr("opacity", 0.8)
                            .text(`Avg: ${avgVO2.toFixed(1)}`);
                    }
                }
            }
        });
        
        // Add gender difference visualization if we have both male and female data
        if (maleData && femaleData && maleData.length > 0 && femaleData.length > 0 && selectedSex === 'Both') {
            // Calculate gender difference over time
            // Make sure both datasets have the same time points
            const maleTimeMap = new Map();
            maleData.forEach(d => maleTimeMap.set(d.time, d.VO2));
            
            // Only use time points present in both datasets
            const comparisonData = femaleData.filter(d => maleTimeMap.has(d.time))
                .map(d => ({
                    time: d.time,
                    maleFemaleGap: maleTimeMap.get(d.time) - d.VO2
                }));
            
            if (comparisonData.length > 0) {
                // Calculate average gender difference
                const avgGap = d3.mean(comparisonData, d => d.maleFemaleGap);
                
                // Add a note about the gender difference
                svg.append("text")
                    .attr("x", width - marginRight - 150)
                    .attr("y", marginTop + yOffset + 15)
                    .attr("text-anchor", "start")
                    .attr("font-size", "12px")
                    .attr("fill", "#555")
                    .text(`Average M/F difference: ${Math.abs(avgGap).toFixed(1)} mL/kg/min`);
                
                // Add an explanation of what this means
                svg.append("text")
                    .attr("x", width - marginRight - 150)
                    .attr("y", marginTop + yOffset + 35)
                    .attr("text-anchor", "start")
                    .attr("font-size", "11px")
                    .attr("fill", "#777")
                    .text(`Males use ${avgGap > 0 ? 'more' : 'less'} oxygen on average`);
            }
        }
        
    } catch (error) {
        console.error("Error processing and displaying groups:", error);
    }
}

// Enhanced function for updating the legend
function updateEnhancedLegend(legend, groupKey, xOffset, yOffset) {
    try {
        // Use improved colors with a professional feel
        const colors = { 
            '0': { fill: '#3498db', stroke: '#2980b9' },  // Male - refined blue
            '1': { fill: '#e84393', stroke: '#c2185b' }   // Female - refined pink
        };
        
        const color = colors[groupKey].fill;
        const strokeColor = colors[groupKey].stroke;
        const textLabel = groupKey === '0' ? 'Male' : 'Female';

        // Add rounded rectangle with stroke for the legend item
        legend.append("rect")
            .attr("x", xOffset)
            .attr("y", yOffset)
            .attr("width", 20)
            .attr("height", 20)
            .attr("rx", 5) // Rounded corners
            .style("fill", color)
            .style("stroke", strokeColor)
            .style("stroke-width", 1.5);

        // Add text label next to the rectangle with improved styling
        legend.append("text")
            .attr("x", xOffset + 26)
            .attr("y", yOffset + 15)
            .text(textLabel)
            .style("font-size", "14px")
            .style("font-weight", "500")
            .style("text-anchor", "start")
            .style("alignment-baseline", "middle")
            .style("fill", "#333");
    } catch (error) {
        console.error("Error updating legend:", error);
    }
}