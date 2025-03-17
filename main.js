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

// Fix for the speed button selection issue
function enhancedSpeedButtonListeners() {
    try {
        // Use the correct selector for speed buttons
        const buttons = document.querySelectorAll('#buttonsSpeed button[data-speed]');
        
        if (buttons.length === 0) {
            // Try alternative selector if the first one doesn't work
            const altButtons = document.querySelectorAll('button[data-speed]');
            if (altButtons.length === 0) {
                console.error("Speed buttons not found");
                return;
            }
            buttons = altButtons;
        }
        
        console.log("Found speed buttons:", buttons.length);
        
        // First, remove existing event listeners by cloning and replacing
        buttons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                console.log("Speed button clicked:", newButton.getAttribute('data-speed'));
                
                // Get all buttons again to ensure we have the current reference
                const allButtons = document.querySelectorAll('button[data-speed]');
                
                // Clear active class from ALL buttons
                allButtons.forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // If clicking the same button, toggle it off
                if (selectedSpeed === Number(newButton.getAttribute('data-speed'))) {
                    selectedSpeed = null;
                    console.log("Speed deselected");
                } else {
                    selectedSpeed = Number(newButton.getAttribute('data-speed')); 
                    // Only add active class to the clicked button
                    newButton.classList.add('active');
                    console.log("Speed selected:", selectedSpeed);
                }
                
                // Update the current selection text
                updateSelectionText();
                
                // Apply the filter
                enhancedApplyCombinedFilter(selectedSex);
                
                // Update the treadmill animation speed
                if (typeof updateTreadmillSpeed === 'function') {
                    updateTreadmillSpeed(selectedSpeed);
                }
            });
        });
        
        console.log("Speed button listeners set up successfully");
    } catch (error) {
        console.error("Error setting up speed button listeners:", error);
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

        // Add a light grid background
        svg.append("rect")
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("fill", "#f8f9fa")
            .attr("rx", 8);

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
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("box-shadow", "0 2px 10px rgba(0,0,0,0.15)")
            .style("pointer-events", "none")
            .style("font-size", "14px")
            .style("max-width", "200px")
            .style("z-index", "10");
        
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
                    const avgElement = document.getElementById('average-vo2-value');
                    if (avgElement) {
                        avgElement.textContent = !isNaN(averageVO2) ? averageVO2.toFixed(2) : "N/A";
                    }
                    
                    // Calculate male average
                    const maleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '0'; }), function(d) { return d.VO2; });
                    const maleAvgElement = document.getElementById('male-vo2-value');
                    if (maleAvgElement) {
                        maleAvgElement.textContent = !isNaN(maleAverageVO2) ? maleAverageVO2.toFixed(2) : "N/A";
                    }
                    
                    // Calculate female average
                    const femaleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '1'; }), function(d) { return d.VO2; });
                    const femaleAvgElement = document.getElementById('female-vo2-value');
                    if (femaleAvgElement) {
                        femaleAvgElement.textContent = !isNaN(femaleAverageVO2) ? femaleAverageVO2.toFixed(2) : "N/A";
                    }
                    
                    // Show all average displays
                    const overallContainer = document.getElementById('overall-average-container');
                    const maleContainer = document.getElementById('male-average-container');
                    const femaleContainer = document.getElementById('female-average-container');
                    
                    if (overallContainer) overallContainer.style.display = 'block';
                    if (maleContainer) maleContainer.style.display = 'block';
                    if (femaleContainer) femaleContainer.style.display = 'block';
                } 
                else if (selectedSex === '0') {
                    // Only show male average
                    const maleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '0'; }), function(d) { return d.VO2; });
                    const maleAvgElement = document.getElementById('male-vo2-value');
                    if (maleAvgElement) {
                        maleAvgElement.textContent = !isNaN(maleAverageVO2) ? maleAverageVO2.toFixed(2) : "N/A";
                    }
                    
                    // Hide other displays
                    const overallContainer = document.getElementById('overall-average-container');
                    const maleContainer = document.getElementById('male-average-container');
                    const femaleContainer = document.getElementById('female-average-container');
                    
                    if (overallContainer) overallContainer.style.display = 'none';
                    if (maleContainer) maleContainer.style.display = 'block';
                    if (femaleContainer) femaleContainer.style.display = 'none';
                }
                else if (selectedSex === '1') {
                    // Only show female average
                    const femaleAverageVO2 = d3.mean(filtered.filter(function(d) { return d.Sex === '1'; }), function(d) { return d.VO2; });
                    const femaleAvgElement = document.getElementById('female-vo2-value');
                    if (femaleAvgElement) {
                        femaleAvgElement.textContent = !isNaN(femaleAverageVO2) ? femaleAverageVO2.toFixed(2) : "N/A";
                    }
                    
                    // Hide other displays
                    const overallContainer = document.getElementById('overall-average-container');
                    const maleContainer = document.getElementById('male-average-container');
                    const femaleContainer = document.getElementById('female-average-container');
                    
                    if (overallContainer) overallContainer.style.display = 'none';
                    if (maleContainer) maleContainer.style.display = 'none';
                    if (femaleContainer) femaleContainer.style.display = 'block';
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
                const avgElement = document.getElementById('average-vo2-value');
                const maleAvgElement = document.getElementById('male-vo2-value');
                const femaleAvgElement = document.getElementById('female-vo2-value');
                
                if (avgElement) avgElement.textContent = "N/A";
                if (maleAvgElement) maleAvgElement.textContent = "N/A";
                if (femaleAvgElement) femaleAvgElement.textContent = "N/A";
                
                // Remove highlighted region
                svg.selectAll(".highlighted-region").remove();
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

        // Set up the legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + (width - marginRight - 150) + ", " + marginTop + ")");

        // Group data by Sex
        const groups = d3.group(filteredData, function(d) { return d.Sex; });
        let yOffset = 0; // For legend positioning
        
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
                
                // Apply smoothing
                const smoothedData = smoothDataPoints(dedupedData);

                // Define a smoother line generator
                const line = d3.line()
                    .x(d => xScale(d.time))
                    .y(d => yScale(d.VO2))
                    .curve(d3.curveMonotoneX); // This creates smoother transitions

                // Draw line with transition for animation
                const path = svg.append('path')
                    .datum(smoothedData)
                    .attr('fill', 'none')
                    .attr('stroke', groupKey === '0' ? '#3498db' : '#e84393')
                    .attr('stroke-width', 3)
                    .attr('d', line);

                // Update legend
                updateEnhancedLegend(legend, groupKey, 0, yOffset);
                yOffset += 24; // Increment for next legend item
                
                // Add peak annotation for clearer visualization
                if (selectedSpeed !== null) {
                    const maxPoint = d3.max(smoothedData, d => d.VO2);
                    const maxDataPoint = smoothedData.find(d => d.VO2 === maxPoint);
                    
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
    } catch (error) {
        console.error("Error processing and displaying groups:", error);
    }
}

// Enhanced function for updating the legend
function updateEnhancedLegend(legend, groupKey, xOffset, yOffset) {
    try {
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
    } catch (error) {
        console.error("Error updating legend:", error);
    }
}