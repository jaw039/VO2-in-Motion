function updatePredictionGraph(predictedVO2, predictedHR) {
    const data = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        VO2: predictedVO2 + i * 2, // Simulated improvement
        HR: predictedHR - i * 2 // Simulated improvement
    }));

    const svg = d3.select('#prediction-graph');
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const xScale = d3.scaleLinear()
        .domain([1, 12])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => Math.min(d.VO2, d.HR)) - 10, d3.max(data, d => Math.max(d.VO2, d.HR)) + 10])
        .range([height, 0]);

    const xAxis = d3.axisBottom(xScale).ticks(12);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxis)
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', '#000')
        .attr('text-anchor', 'middle')
        .text('Months');

    svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('fill', '#000')
        .attr('text-anchor', 'middle')
        .text('Value');

    // Add VO2 line
    const vo2Line = d3.line()
        .x(d => xScale(d.month) + margin.left)
        .y(d => yScale(d.VO2) + margin.top);

    svg.append('path')
        .datum(data)
        .attr('d', vo2Line)
        .attr('stroke', '#3498db')
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr('class', 'vo2-line');

    // Add HR line
    const hrLine = d3.line()
        .x(d => xScale(d.month) + margin.left)
        .y(d => yScale(d.HR) + margin.top);

    svg.append('path')
        .datum(data)
        .attr('d', hrLine)
        .attr('stroke', '#e84393')
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr('class', 'hr-line');

    // Add legend
    svg.append('text')
        .attr('x', width + margin.left - 100)
        .attr('y', margin.top + 20)
        .attr('fill', '#3498db')
        .text('VO2');

    svg.append('text')
        .attr('x', width + margin.left - 100)
        .attr('y', margin.top + 40)
        .attr('fill', '#e84393')
        .text('Heart Rate');
}

function getHealthAdvice(predictedVO2, predictedHR) {
    let advice = "";
    if (predictedVO2 < 30) {
        advice += "Your predicted VO2 is below average. Consider incorporating more cardio exercises like running or cycling to improve your aerobic fitness. ";
    } else if (predictedVO2 >= 30 && predictedVO2 < 50) {
        advice += "Your predicted VO2 is within the average range. To improve further, try high-intensity interval training (HIIT). ";
    } else {
        advice += "Your predicted VO2 is above average! Keep up the great work with regular aerobic exercises. ";
    }

    if (predictedHR > 160) {
        advice += "Your predicted heart rate is high. Ensure you're not overexerting yourself and consider consulting a doctor. ";
    } else if (predictedHR >= 120 && predictedHR <= 160) {
        advice += "Your predicted heart rate is in a healthy range for exercise. Maintain this intensity for optimal fitness. ";
    } else {
        advice += "Your predicted heart rate is low. You might need to increase your workout intensity for better results. ";
    }

    return advice;
}

document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const age = document.getElementById('age').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    const speed = document.getElementById('speed').value;
    const gender = document.getElementById('gender-pred').value;

    // Example prediction logic (replace with actual model predictions)
    const predictedVO2 = 30 + 0.5 * age + 0.2 * weight - 0.1 * height + 2 * speed;
    const predictedHR = 70 + 0.8 * age + 0.1 * weight + 0.05 * height + 5 * speed;

    document.getElementById('predicted-vo2').textContent = predictedVO2.toFixed(2);
    document.getElementById('predicted-hr').textContent = predictedHR.toFixed(2);

    // Add health advice
    const advice = getHealthAdvice(predictedVO2, predictedHR);
    document.getElementById('health-advice').textContent = advice;

    // Update the interactive prediction graph
    updatePredictionGraph(predictedVO2, predictedHR);
});