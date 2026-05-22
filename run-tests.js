const fs = require('fs');
const path = require('path');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const sirkuitCode = fs.readFileSync(path.join(__dirname, 'js', 'sirkuit.js'), 'utf8');

const bugConditionHTML = fs.readFileSync(path.join(__dirname, 'test-bug-condition.html'), 'utf8');

const dom = new JSDOM(bugConditionHTML, {
  runScripts: 'dangerously',
  resources: 'usable',
  beforeParse(window) {
    const script = window.document.createElement('script');
    script.textContent = sirkuitCode;
    window.document.head.appendChild(script);
  }
});

setTimeout(() => {
  const results = dom.window.document.getElementById('test-output').textContent;
  console.log(results);
}, 2000);
