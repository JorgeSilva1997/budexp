const { execFileSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

/**
 * Run expo-doctor and generate HTML report
 */
async function runExpoDoctor(options = {}) {
  const ora = require('ora');

  const spinner = ora({
    text: 'Running budexp check...',
    color: 'cyan',
    spinner: 'dots',
  }).start();

  try {
    // Run expo-doctor and capture output
    const output = execFileSync('npx', ['expo-doctor'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    spinner.text = 'Generating HTML report...';

    // Generate HTML report
    const htmlReport = generateHTMLReport(output);

    // Save report to file
    const reportPath = path.join(process.cwd(), 'expo-doctor-report.html');
    fs.writeFileSync(reportPath, htmlReport);

    spinner.succeed(`HTML report generated: ${reportPath}`);

    // Prompt user to open report
    await promptToOpenReport(reportPath, options);

    return {
      output,
      reportPath,
      hasIssues:
        output.includes('✖') || output.includes('⚠') || output.toLowerCase().includes('error'),
    };
  } catch (e) {
    spinner.text = 'Issues detected, generating report...';

    const errorOutput = e.stdout || e.message;
    const htmlReport = generateHTMLReport(errorOutput);
    const reportPath = path.join(process.cwd(), 'expo-doctor-report.html');
    fs.writeFileSync(reportPath, htmlReport);

    spinner.warn('expo-doctor found issues. Check the report for details.');

    // Prompt user to open report
    await promptToOpenReport(reportPath, options);

    return {
      output: errorOutput,
      reportPath,
      hasIssues: true,
    };
  }
}

/**
 * Prompt user to open the report
 */
async function promptToOpenReport(reportPath, options = {}) {
  const readline = require('readline');
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  if (options.openReport === false) {
    console.log('');
    logger.info('Report saved. Open it later at:');
    logger.info(reportPath);
    return;
  }

  if (!isInteractive) {
    console.log('');
    logger.info('Non-interactive shell detected. Skipping report open prompt.');
    logger.info('Report saved at:');
    logger.info(reportPath);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('');
    rl.question('Would you like to open the report? (y/n): ', (answer) => {
      rl.close();

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        openReport(reportPath);
      } else {
        console.log('');
        logger.info('Report saved. You can open it later at:');
        logger.info(reportPath);
      }

      resolve();
    });
  });
}

/**
 * Open report in default browser
 */
function openReport(reportPath) {
  try {
    const platform = process.platform;
    let command;

    // Determine the command based on the platform
    if (platform === 'darwin') {
      // macOS
      command = ['open', [reportPath]];
    } else if (platform === 'win32') {
      // Windows
      command = ['cmd', ['/c', 'start', '', reportPath]];
    } else {
      // Linux and others
      command = ['xdg-open', [reportPath]];
    }

    execFileSync(command[0], command[1], { stdio: 'ignore' });
    console.log('');
    logger.success('Opening report in your default browser...');
  } catch (e) {
    console.log('');
    logger.error('Failed to open report automatically');
    logger.info('Please open it manually at:');
    logger.info(reportPath);
  }
}

/**
 * Generate enhanced HTML report from expo-doctor output
 */
function generateHTMLReport(output) {
  const timestamp = new Date().toLocaleString();
  const summary = getIssuesSummary(output);

  // Escape HTML
  const escapedOutput = output.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Split into lines for better rendering
  const lines = escapedOutput.split('\n');
  const renderedLines = lines.map((line, index) => {
    // Remove ANSI codes
    let cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');

    // Determine line type and styling
    let className = 'line-normal';
    let icon = '';

    if (cleanLine.includes('✖') || cleanLine.toLowerCase().includes('error')) {
      className = 'line-error';
      icon = '❌';
    } else if (cleanLine.includes('⚠') || cleanLine.toLowerCase().includes('warning')) {
      className = 'line-warning';
      icon = '⚠️';
    } else if (cleanLine.includes('✔') || cleanLine.toLowerCase().includes('success')) {
      className = 'line-success';
      icon = '✅';
    } else if (cleanLine.includes('ℹ') || cleanLine.toLowerCase().includes('info')) {
      className = 'line-info';
      icon = 'ℹ️';
    }

    return {
      number: index + 1,
      text: cleanLine,
      className,
      icon,
    };
  });

  // Generate grouped issues HTML (including suggestions)
  const groupedIssuesHTML = generateGroupedIssues(summary, output);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Budexp Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
            color: #2d3748;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }
        
        .title {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .title h1 {
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .title-icon {
            font-size: 40px;
        }
        
        .timestamp {
            color: #718096;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            animation: slideIn 0.5s ease;
        }
        
        .status-badge.success {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
        }
        
        .status-badge.error {
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
            color: white;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 24px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 20px;
            border-radius: 12px;
            border: 2px solid transparent;
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            border-color: #667eea;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
        }
        
        .stat-card.error {
            border-color: #fc8181;
        }
        
        .stat-card.warning {
            border-color: #f6ad55;
        }
        
        .stat-card.success {
            border-color: #68d391;
        }
        
        .stat-label {
            font-size: 13px;
            color: #718096;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .stat-value {
            font-size: 36px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stat-value.error { color: #f56565; }
        .stat-value.warning { color: #ed8936; }
        .stat-value.success { color: #48bb78; }
        
        .section {
            background: white;
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            animation: fadeIn 0.5s ease;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            cursor: pointer;
            user-select: none;
        }
        
        .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #2d3748;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .toggle-icon {
            font-size: 20px;
            transition: transform 0.3s ease;
        }
        
        .toggle-icon.collapsed {
            transform: rotate(-90deg);
        }
        
        .section-content {
            max-height: 2000px;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        
        .section-content.collapsed {
            max-height: 0;
        }
        
        .issues-group {
            margin-bottom: 24px;
        }
        
        .issues-group:last-child {
            margin-bottom: 0;
        }
        
        .issue-item {
            background: #f7fafc;
            border-left: 4px solid #e2e8f0;
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .issue-item:hover {
            background: #edf2f7;
            transform: translateX(4px);
        }
        
        .issue-item.error {
            border-left-color: #f56565;
            background: #fff5f5;
        }
        
        .issue-item.error:hover {
            background: #fed7d7;
        }
        
        .issue-item.warning {
            border-left-color: #ed8936;
            background: #fffaf0;
        }
        
        .issue-item.warning:hover {
            background: #feebc8;
        }
        
        .issue-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .issue-icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .issue-text {
            flex: 1;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .terminal-output {
            background: #1e1e1e;
            border-radius: 12px;
            overflow: hidden;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 13px;
        }
        
        .terminal-header {
            background: #323233;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1e1e1e;
        }
        
        .terminal-title {
            color: #d4d4d4;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .terminal-buttons {
            display: flex;
            gap: 8px;
        }
        
        .terminal-button {
            background: #4a5568;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        
        .terminal-button:hover {
            background: #667eea;
        }
        
        .terminal-button:active {
            transform: scale(0.95);
        }
        
        .terminal-body {
            padding: 20px;
            max-height: 600px;
            overflow-y: auto;
            background: #1e1e1e;
        }
        
        .terminal-line {
            display: flex;
            gap: 12px;
            padding: 4px 0;
            line-height: 1.6;
        }
        
        .line-number {
            color: #6e7681;
            user-select: none;
            min-width: 40px;
            text-align: right;
        }
        
        .line-content {
            color: #d4d4d4;
            flex: 1;
            white-space: pre-wrap;
            word-break: break-word;
        }
        
        .line-error .line-content {
            color: #f87171;
        }
        
        .line-warning .line-content {
            color: #fbbf24;
        }
        
        .line-success .line-content {
            color: #4ade80;
        }
        
        .line-info .line-content {
            color: #60a5fa;
        }
        
        .search-box {
            margin-bottom: 16px;
        }
        
        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .footer a {
            color: white;
            text-decoration: underline;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        .highlight {
            background: #fef3c7;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        .suggestions-intro {
            background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        
        .suggestions-intro p {
            margin: 0;
            color: #4c51bf;
            font-weight: 500;
            font-size: 15px;
        }
        
        .suggestions-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .suggestion-card {
            display: flex;
            gap: 16px;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 2px solid #86efac;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .suggestion-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #10b981 0%, #059669 100%);
        }
        
        .suggestion-card:hover {
            transform: translateX(4px);
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2);
            border-color: #10b981;
        }
        
        .suggestion-number {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        
        .suggestion-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .suggestion-text {
            color: #065f46;
            font-size: 15px;
            line-height: 1.6;
            font-weight: 500;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        }
        
        .suggestion-link {
            color: #059669;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .suggestion-link:hover {
            color: #047857;
            gap: 8px;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 20px 12px;
            }
            
            .header {
                padding: 20px;
            }
            
            .title h1 {
                font-size: 24px;
            }
            
            .section {
                padding: 20px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-top">
                <div class="title">
                    <h1>Budexp Report</h1>
                </div>
                <div class="timestamp">
                    ${timestamp}
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card ${summary.errors && summary.errors.length > 0 ? 'error' : ''}">
                    <div class="stat-label">Errors</div>
                    <div class="stat-value error">
                        <span>❌</span>
                        <span>${summary.errors ? summary.errors.length : 0}</span>
                    </div>
                </div>
                
                <div class="stat-card ${summary.warnings && summary.warnings.length > 0 ? 'warning' : ''}">
                    <div class="stat-label">Warnings</div>
                    <div class="stat-value warning">
                        <span>⚠️</span>
                        <span>${summary.warnings ? summary.warnings.length : 0}</span>
                    </div>
                </div>
                
                <div class="stat-card success">
                    <div class="stat-label">Total Checks</div>
                    <div class="stat-value success">
                        <span>✅</span>
                        <span>${lines.length}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Issues Section -->
        ${groupedIssuesHTML}
        
        <!-- Full Output Section -->
        <div class="section">
            <div class="section-header" onclick="toggleSection('output')">
                <div class="section-title">
                    <span>Full Terminal Output</span>
                </div>
                <span class="toggle-icon" id="output-toggle">▼</span>
            </div>
            
            <div class="section-content" id="output-content">
                <div class="search-box">
                    <input 
                        type="text" 
                        class="search-input" 
                        id="search-input"
                        placeholder="🔍 Search in output..."
                        onkeyup="searchInOutput()"
                    />
                </div>
                
                <div class="terminal-output">
                    <div class="terminal-header">
                        <div class="terminal-title">
                            <span>💻</span>
                            <span>expo-doctor output</span>
                        </div>
                        <div class="terminal-buttons">
                            <button class="terminal-button" onclick="copyOutput()">
                                📋 Copy
                            </button>
                        </div>
                    </div>
                    <div class="terminal-body" id="terminal-body">
                        ${renderedLines
                          .map(
                            (line) => `
                            <div class="terminal-line ${line.className}" data-line="${line.text.toLowerCase()}">
                                <span class="line-number">${line.number}</span>
                                <span class="line-content">${line.icon ? line.icon + ' ' : ''}${line.text || '&nbsp;'}</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            Generated by <strong>budexp</strong> CLI tool 
        </div>
    </div>
    
    <script>
        function toggleSection(sectionId) {
            const content = document.getElementById(sectionId + '-content');
            const toggle = document.getElementById(sectionId + '-toggle');
            
            content.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        }
        
        function copyOutput() {
            const lines = document.querySelectorAll('.terminal-line .line-content');
            const text = Array.from(lines).map(line => line.textContent).join('\\n');
            
            navigator.clipboard.writeText(text).then(() => {
                const button = event.target.closest('.terminal-button');
                const originalText = button.innerHTML;
                button.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);
            });
        }
        
        function searchInOutput() {
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            const lines = document.querySelectorAll('.terminal-line');
            
            lines.forEach(line => {
                const text = line.getAttribute('data-line');
                const content = line.querySelector('.line-content');
                
                if (searchTerm === '') {
                    line.style.display = 'flex';
                    content.innerHTML = content.textContent;
                } else if (text.includes(searchTerm)) {
                    line.style.display = 'flex';
                    
                    // Highlight matching text
                    const originalText = content.textContent;
                    const regex = new RegExp(\`(\${searchTerm})\`, 'gi');
                    content.innerHTML = originalText.replace(regex, '<span class="highlight">$1</span>');
                } else {
                    line.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>`;
}

/**
 * Extract suggestions/advice from output
 */
function extractSuggestions(output) {
  const suggestions = [];
  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();

    // Look for "Advice:" sections and collect following lines
    if (lowerLine.startsWith('advice:')) {
      // Get the next non-empty lines as suggestions
      for (let j = i + 1; j < lines.length; j++) {
        const suggestionLine = lines[j].trim();
        if (!suggestionLine) continue;

        // Stop if we hit another section or check
        if (
          suggestionLine.toLowerCase().startsWith('advice:') ||
          suggestionLine.includes('✖') ||
          suggestionLine.includes('✔') ||
          suggestionLine.toLowerCase().includes('check ')
        ) {
          break;
        }

        suggestions.push({
          text: suggestionLine,
          type: 'advice',
        });
        break; // Only get the first line after "Advice:"
      }
    }

    // Also capture lines that start with common suggestion patterns
    if (
      lowerLine.startsWith('use ') ||
      lowerLine.startsWith('run ') ||
      lowerLine.startsWith('resolve ') ||
      lowerLine.startsWith('update ') ||
      lowerLine.startsWith('install ')
    ) {
      // Avoid duplicates
      if (!suggestions.some((s) => s.text === line)) {
        suggestions.push({
          text: line,
          type: 'action',
        });
      }
    }
  }

  return suggestions;
}

/**
 * Generate grouped issues HTML section
 */
function generateGroupedIssues(summary, output) {
  if (!summary.hasIssues) {
    return `
        <div class="section">
            <div class="section-title">
                <span>Great News!</span>
            </div>
            <div class="section-content">
                <p style="color: #48bb78; font-size: 18px; text-align: center; padding: 40px;">
                    All checks passed! Your Expo project is healthy and ready to go!
                </p>
            </div>
        </div>
    `;
  }

  let html = '';

  // Suggestions/Recommendations section
  const suggestions = extractSuggestions(output);
  if (suggestions.length > 0) {
    html += `
        <div class="section">
            <div class="section-header" onclick="toggleSection('suggestions')">
                <div class="section-title">
                    <span>Recommendations (${suggestions.length})</span>
                </div>
                <span class="toggle-icon" id="suggestions-toggle">▼</span>
            </div>
            <div class="section-content" id="suggestions-content">
                <div class="suggestions-intro">
                    <p>Here are actionable steps to resolve the issues found in your project:</p>
                </div>
                <div class="suggestions-list">
                    ${suggestions
                      .map((suggestion, index) => {
                        // Check if it contains a URL
                        const urlMatch = suggestion.text.match(/(https?:\/\/[^\s]+)/);
                        let displayText = suggestion.text;
                        let linkHtml = '';

                        if (urlMatch) {
                          const url = urlMatch[0];
                          displayText = suggestion.text.replace(url, '').trim();
                          linkHtml = `<a href="${url}" target="_blank" class="suggestion-link">📚 Learn more →</a>`;
                        }

                        return `
                        <div class="suggestion-card">
                            <div class="suggestion-number">${index + 1}</div>
                            <div class="suggestion-content">
                                <div class="suggestion-text">${displayText}</div>
                                ${linkHtml}
                            </div>
                        </div>
                      `;
                      })
                      .join('')}
                </div>
            </div>
        </div>
    `;
  }

  // Errors section
  if (summary.errors && summary.errors.length > 0) {
    html += `
        <div class="section">
            <div class="section-header" onclick="toggleSection('errors')">
                <div class="section-title">
                    <span>Errors (${summary.errors.length})</span>
                </div>
                <span class="toggle-icon" id="errors-toggle">▼</span>
            </div>
            <div class="section-content" id="errors-content">
                <div class="issues-group">
                    ${summary.errors
                      .map(
                        (issue) => `
                        <div class="issue-item error">
                            <div class="issue-header">
                                <span class="issue-icon">❌</span>
                                <div class="issue-text">${issue.message}</div>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        </div>
    `;
  }

  // Warnings section
  if (summary.warnings && summary.warnings.length > 0) {
    html += `
        <div class="section">
            <div class="section-header" onclick="toggleSection('warnings')">
                <div class="section-title">
                    <span>Warnings (${summary.warnings.length})</span>
                </div>
                <span class="toggle-icon" id="warnings-toggle">▼</span>
            </div>
            <div class="section-content" id="warnings-content">
                <div class="issues-group">
                    ${summary.warnings
                      .map(
                        (issue) => `
                        <div class="issue-item warning">
                            <div class="issue-header">
                                <span class="issue-icon">⚠️</span>
                                <div class="issue-text">${issue.message}</div>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        </div>
    `;
  }

  return html;
}

/**
 * Parse expo-doctor output for issues
 */
function parseIssues(output) {
  const issues = [];
  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('✖') || line.includes('⚠') || line.toLowerCase().includes('error')) {
      issues.push({
        line: i + 1,
        message: line.trim(),
        severity: line.includes('✖') ? 'error' : 'warning',
      });
    }
  }

  return issues;
}

/**
 * Get human-readable summary of issues
 */
function getIssuesSummary(output) {
  const issues = parseIssues(output);

  if (issues.length === 0) {
    return {
      hasIssues: false,
      summary: 'All checks passed! Your Expo project is healthy.',
      issues: [],
    };
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    hasIssues: true,
    summary: `Found ${errors.length} error(s) and ${warnings.length} warning(s)`,
    errors,
    warnings,
    issues,
  };
}

module.exports = {
  runExpoDoctor,
  generateHTMLReport,
  parseIssues,
  getIssuesSummary,
};
