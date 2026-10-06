const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');

function setup(entry = 'index.html') {
  const repo = path.resolve(__dirname, '..');
  const filename = path.resolve(repo, entry);
  const failures = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', err => failures.push(err.message));
  const dom = new JSDOM(fs.readFileSync(filename, 'utf8'), {runScripts: 'outside-only', url: 'https://example.test/' + entry, virtualConsole});
  const w = dom.window;
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  w.fetch = function () { throw Error('Unexpected request with report data'); };
  const downloads = [];
  w.URL.createObjectURL = blob => { downloads.push(blob); return 'blob:test-' + downloads.length; };
  w.URL.revokeObjectURL = () => {};
  function bytes(blob) {
    return new Promise((resolve, reject) => {
      const reader = new w.FileReader();
      reader.onload = () => resolve(Buffer.from(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }
  w.Blob.prototype.arrayBuffer = async function () { const b = await bytes(this); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
  w.Blob.prototype.text = async function () { return (await bytes(this)).toString('utf8'); };
  for (const tag of w.document.querySelectorAll('script[src]')) {
    const src = tag.getAttribute('src');
    if (/^https:/.test(src)) {
      const lib = src.includes('exceljs') ? require.resolve('exceljs/dist/exceljs.min.js') : require.resolve('xlsx/dist/xlsx.full.min.js');
      w.eval(fs.readFileSync(lib, 'utf8'));
    } else {
      w.eval(fs.readFileSync(path.resolve(path.dirname(filename), src), 'utf8'));
    }
  }
  const get = id => { const el = w.document.getElementById(id); assert.ok(el, 'Missing #' + id); return el; };
  const change = (id, value, event = 'input') => { get(id).value = String(value); get(id).dispatchEvent(new w.Event(event, {bubbles:true})); };
  const upload = async (id, data, name = 'synthetic.csv') => {
    Object.defineProperty(get(id), 'files', {configurable:true, value:[new w.File([data], name, {type:'application/octet-stream'})]});
    get(id).dispatchEvent(new w.Event('change', {bubbles:true}));
    await tick();
  };
  const finish = () => { assert.deepEqual(failures, [], 'Runtime errors'); dom.window.close(); };
  return {w, get, change, upload, downloads, bytes, finish};
}
const tick = () => new Promise(resolve => setTimeout(resolve, 80));
const numeric = text => Number(text.replace(/[\s\u00a0\u202f]/g,'').replace(/,/g,'.').replace(/[^0-9.-]/g,''));
async function waitFor(test) { for (let i=0; i<100; i++) { if(test()) return; await new Promise(r=>setTimeout(r,30)); } throw Error('Timed out waiting for download'); }
module.exports = {setup, assert, tick, numeric, waitFor};
