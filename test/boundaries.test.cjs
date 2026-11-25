const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {PackageFiles, PackageNetwork, PackageProcess, PackageSecrets, createEventClient, createDispatcher} = require('..');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'mio-extra-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'data'));
  const grants = {files:[{root:'data',access:'read-write'}],process:[]};
  const host = {enforce(){}, grantsFor:()=>grants, packageRoot:()=>root};
  return {root,host,grants};
}
test('rejects absolute, NUL and backslash traversal paths before I/O', async t=>{
  const {host} = fixture(t);
  for (const value of ['', '/etc/passwd', '../x', 'data/../x', 'data\\..\\x', 'data/\0x', 42]) {
    await assert.rejects(new PackageFiles(host,'p').readFile(value), {code:'RESOURCE_BOUNDARY_DENIED'});
  }
});
test('filesystem event roundtrip retains grants on every operation', async t=>{
  const {host,grants} = fixture(t);
  const client = createEventClient(createDispatcher({files:new PackageFiles(host,'p')}));
  assert.equal(await client.mkdir('data/sub'),null);
  assert.equal(await client.writeText('data/sub/x','hello'),null);
  assert.equal(await client.readText('data/sub/x'),'hello');
  assert.deepEqual(await client.list('data/sub'),['x']);
  grants.files[0].access='read';
  await assert.rejects(client.writeText('data/sub/x','denied'),{code:'RESOURCE_BOUNDARY_DENIED'});
});
test('network rejects credentials and bounds redirect loops', async t=>{
  const {host}=fixture(t);
  let calls=0;
  host.fetch=async()=>{calls++;return new Response(null,{status:302,headers:{location:'/loop'}})};
  const network=new PackageNetwork(host,'p');
  await assert.rejects(network.fetch('https://user:password@example.com'),{code:'RESOURCE_BOUNDARY_DENIED'});
  assert.equal(calls,0);
  await assert.rejects(network.fetch('https://example.com'),{code:'RESOURCE_BOUNDARY_DENIED'});
  assert.equal(calls,11);
});
test('authority denial prevents secret resolution and process creation', t=>{
  const {host}=fixture(t);
  let resolved=false;
  host.resolveSecret=()=>{resolved=true};
  host.enforce=()=>{throw Object.assign(new Error('denied'),{code:'AUTHORITY_DENIED'})};
  assert.throws(()=>new PackageSecrets(host,'p').get('TOKEN'),{code:'AUTHORITY_DENIED'});
  assert.equal(resolved,false);
  assert.throws(()=>new PackageProcess(host,'p').spawn('anything'),{code:'AUTHORITY_DENIED'});
});
test('secret handle rejects consumers and keeps resolver out of inspection', async t=>{
  const {host}=fixture(t);
  host.resolveSecret=async()=> 'value';
  const secret = new PackageSecrets(host,'p').get('TOKEN');
  assert.equal(Object.isFrozen(secret),true);
  assert.deepEqual(Object.keys(secret),['name']);
  await assert.rejects(secret.withValue(null),TypeError);
  assert.equal(await secret.withValue(v=>v),'value');
});
test('same client works with an in-memory event implementation', async ()=>{
  const store=new Map();
  const client=createEventClient(async (event,p)=>{
    if(event==='files::event:writeText'){store.set(p.path,p.text);return null}
    if(event==='files::event:readText')return store.get(p.path);
    throw Error('unsupported');
  });
  await client.writeText('data/x','portable');
  assert.equal(await client.readText('data/x'),'portable');
});
