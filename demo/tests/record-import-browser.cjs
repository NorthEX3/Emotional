const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
function pdfBytes() {
  const stream='BT /F1 12 Tf 20 80 Td (Me: hello) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let data='%PDF-1.4\n', offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(data));data+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=Buffer.byteLength(data);data+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(data);
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[], requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>{
   if(!route.request().url().startsWith('https://vision.test/'))return route.abort();
   requests.push(route.request().postDataJSON());
   return route.fulfill({json:{choices:[{message:{content:'左侧：你好\n右侧：嗯，刚忙完'}}]}});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const formats=await page.evaluate(()=>{
   const I=RecordImport, L=StyleLearning;
   const csv=I.textRecords('sender,content\n我,"hi, there"\n林,"好\n晚点聊"','csv');
   assertLocal(L.parse(csv).messages.length===2,'CSV multiline');
   const html=I.textRecords('<script>window.bad=true</script><div><span class="sender">林</span><div class="content">好<br>晚点聊</div></div>','html');
   assertLocal(html.includes('晚点聊')&&!window.bad,'HTML inert');
   const xml=I.textRecords('<smses><sms type="1" address="123" body="你好"/><sms type="2" address="123" body="好"/></smses>','xml');
   assertLocal(L.parse(xml).speakers.includes('我'),'SMS both directions');
   const json=I.textRecords(JSON.stringify({data:[{user:{nickname:'林'},title:'今天',desc:'很好'}]}),'json');
   assertLocal(json.includes('今天')&&json.includes('很好'),'social JSON');
   const posts=I.textRecords('[{"media":[{"caption":"我的帖子"}]}]','json','林');
   assertLocal(L.selectSamples(L.parse(posts),{'林':'target'}).targetCount===1,'single author');
   return true;
   function assertLocal(ok,name){if(!ok)throw Error(name)}
  });assert(formats);
  const pdf=await page.evaluate(async bytes=>RecordImport.convert(new File([new Uint8Array(bytes)],'sample.pdf')),[...pdfBytes()]);
  assert(pdf.includes('Me: hello'));
  const db=await page.evaluate(async()=>{
   const SQL=await initSqlJs(), db=new SQL.Database();
   db.run('CREATE TABLE message(text TEXT,date INTEGER,is_from_me INTEGER,handle_id INTEGER); CREATE TABLE handle(id TEXT); INSERT INTO handle VALUES ("林"); INSERT INTO message VALUES ("你好",1,0,1),("好",2,1,1);');
   const file=new File([db.export()],'chat.db');db.close();return RecordImport.convert(file);
  });assert(db.includes('林：你好')&&db.includes('我：好'));
  await page.click('.conv-item[data-id="xiaonuan"]');await page.click('#btn-char-detail-settings');await page.click('#btn-style-learning');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/X7sAAAAASUVORK5CYII=','base64');
  await page.locator('#learning-file').setInputFiles({name:'chat.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>document.getElementById('learning-feedback').textContent.includes('本地选中'));
  assert.equal(requests.length,0);
  assert(await page.locator('#learning-file-preview').isVisible());
  assert((await page.locator('#learning-file-state').textContent()).includes('尚未发送'));
  await page.locator('#learning-vision-config').evaluate(node=>node.open=true);
  await page.fill('#learning-vision-url','https://vision.test/v1');await page.fill('#learning-vision-model','vision-test');await page.fill('#learning-vision-key','fake-only');
  await page.click('#learning-save-vision');
  assert.equal(requests.length,0);
  await page.click('#learning-recognize');await page.waitForFunction(()=>document.getElementById('learning-feedback').textContent.includes('识别完成'));
  assert.equal(requests.length,1);assert.equal(requests[0].model,'vision-test');
  assert.equal(await page.getByLabel('左侧 的身份',{exact:true}).count(),1);
  await page.locator('#learning-file').setInputFiles({name:'sample.pdf',mimeType:'application/pdf',buffer:pdfBytes()});
  await page.waitForFunction(()=>document.getElementById('learning-text').value.includes('Me: hello'));
  assert.equal(requests.length,1);
  await page.click('#learning-recognize');await page.waitForFunction(()=>document.getElementById('learning-feedback').textContent.includes('识别完成'));
  assert.equal(requests.length,2);
  await page.route('https://vision.test/**',route=>route.fulfill({status:500,body:'test failure'}));
  await page.click('#learning-recognize');
  await page.waitForFunction(()=>document.getElementById('learning-file-state').textContent.includes('未完成'));
  assert.equal(await page.locator('#learning-recognize').isDisabled(),false);
  for(const width of [1440,320]){
   await page.setViewportSize({width,height:1000});
   assert(await page.locator('.learning-modal').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
   if(process.env.IMPORT_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.IMPORT_SCREENSHOT_DIR,`import-${width}.png`),fullPage:true});
  }
  await page.click('#learning-close');
  assert.equal(await page.locator('#learning-vision-key').inputValue(),'');
  await page.setViewportSize({width:1440,height:1000});
  await page.click('#btn-char-detail-settings');
  await page.click('#btn-style-learning');
  assert.equal(await page.locator('#learning-vision-key').inputValue(),'fake-only');
  await page.reload();
  await page.click('.conv-item[data-id="xiaonuan"]');await page.click('#btn-char-detail-settings');await page.click('#btn-style-learning');
  assert.equal(await page.locator('#learning-vision-url').inputValue(),'https://vision.test/v1');
  assert.equal(await page.locator('#learning-vision-model').inputValue(),'vision-test');
  assert.equal(await page.locator('#learning-vision-key').inputValue(),'fake-only');
  await page.locator('#learning-file').setInputFiles({name:'chat.png',mimeType:'image/png',buffer:png});
  await page.locator('#learning-vision-config').evaluate(node=>node.open=true);
  await page.click('#learning-clear-vision');
  assert.equal(await page.locator('#learning-vision-key').inputValue(),'');
  assert.equal(await page.evaluate(()=>Object.values(localStorage).some(v=>v.includes('fake-only'))),false);
  assert.deepEqual(errors,[]);
  console.log('PASS imports, opt-in recognition, saved API settings across reopen/reload, clear settings, desktop/mobile');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
