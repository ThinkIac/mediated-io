const assert = require('node:assert/strict');
const fs = require('node:fs'), os=require('node:os'), path=require('node:path');
const old = require(path.resolve(process.argv[2] || (()=>{throw Error('Usage: node scripts/check-legacy.cjs /path/to/original')})()));
const next = require('..');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mio-compare-'));
 let count=0;
 try {
  fs.mkdirSync(path.join(root,'data'));fs.writeFileSync(path.join(root,'data/x'),'ok');
  fs.writeFileSync(path.join(root,'outside'),'outside');fs.symlinkSync(path.join(root,'outside'),path.join(root,'data/escape'));
  const paths=['','.', 'data','data/x','data/escape','data/missing','data/new/x','other/x','../outside','data/../outside','/etc/passwd','data\\..\\outside','data/\0x',null,4];
  const outcome=async fn=>{try{return {value:await fn()}}catch(e){return {name:e.name,code:e.code,message:e.message}}};
  for(const access of ['read','write','read-write']){
   const host={enforce(){},packageRoot:()=>root,grantsFor:()=>({files:[{root:'data',access}]})};
   for(const operation of ['read','write'])for(const p of paths){
    assert.deepEqual(await outcome(()=>new next.PackageFiles(host,'p').resolve(p,operation)),await outcome(()=>new old.PackageFiles(host,'p').resolve(p,operation)));
    count++;
   }
  }
  for(const status of [200,301,302,303,307,308]){
   for(const location of [null,'/final','https://blocked.example','https://user:pass@allowed.example']){
    const run=async api=>{
     let calls=0;const checks=[];
     const host={enforce:(...args)=>checks.push(args),fetch:async()=>({status:calls++ ? 200 : status,headers:{get:()=>location}})};
     const result=await outcome(async()=> (await new api.PackageNetwork(host,'p').fetch('https://allowed.example')).status);
     return {result,calls,checks};
    };
    assert.deepEqual(await run(next),await run(old));count++;
   }
  }
  console.log(count+' legacy behavior comparisons passed');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
