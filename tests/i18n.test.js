import test from 'node:test';
import assert from 'node:assert/strict';
import { allKeys } from '../scripts/i18n-keys.mjs';
import { t, num, plural, detectLanguage, useLanguage, translateData, LANGUAGES } from '../src/i18n.js';
import en from '../src/locales/en.js';
import es from '../src/locales/es.js';

const placeholders=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');

test('every text the game shows is translated into English and Spanish',async()=>{
  const keys=await allKeys();
  assert.ok(keys.size>600,'The texts are found');
  for(const [code,dictionary] of [['en',en],['es',es]]){
    const missing=[...keys].filter(k=>!(k in dictionary));
    assert.deepEqual(missing,[],`${code} lacks ${missing.length} texts (node scripts/i18n-keys.mjs ${code})`);
  }
});

test('translations keep the placeholders, the HTML and a two-line title\'s split',()=>{
  for(const [code,dictionary] of [['en',en],['es',es]])for(const [sv,text] of Object.entries(dictionary)){
    assert.equal(placeholders(text),placeholders(sv),`${code}: ${sv}`);
    assert.equal((text.match(/<br>/g)||[]).length,(sv.match(/<br>/g)||[]).length,`${code} line breaks: ${sv}`);
    if(sv.includes('|'))assert.equal(text.split('|').length,2,`${code} title: ${sv}`);
    assert.ok(text.trim().length>0,`${code} empty: ${sv}`);
  }
});

test('the language: the address, then the saved choice, then the device; English otherwise',()=>{
  assert.equal(detectLanguage({search:'?lang=es',stored:'en',preferred:['sv-SE']}),'es');
  assert.equal(detectLanguage({search:'?lang=xx',stored:'sv',preferred:['es']}),'sv');
  assert.equal(detectLanguage({preferred:['es-AR','en']}),'es');
  assert.equal(detectLanguage({preferred:['sv-FI']}),'sv');
  assert.equal(detectLanguage({preferred:['de-DE','fr']}),'en');
  assert.deepEqual(LANGUAGES.map(l=>l.code),['sv','en','es']);
});

test('t fills in values, falls back to Swedish and writes decimals the local way',()=>{
  useLanguage('en');
  try{
    assert.equal(t('Hål {n}',{n:'03'}),'Hole 03');
    assert.equal(t('Ingen sådan text'),'Ingen sådan text');
    assert.equal(plural(1,'1 slag','{n} slag'),'1 stroke');assert.equal(plural(3,'1 slag','{n} slag'),'3 strokes');
    assert.equal(num(1.25),'1.3');
    useLanguage('es');assert.equal(num(1.25),'1,3');assert.equal(t('Sikta'),'Apunta');
  }finally{useLanguage('sv')}
  assert.equal(t('Hål {n}',{n:'03'}),'Hål 03');
});

test('game data is translated in place, but internal keys never change',()=>{
  const level={id:1,theme:'clockwork',name:'Gökporten',title:['GÖK','PORTEN'],recordKey:'minimayhem-clockwork-1',labels:[['START',-16,0]],routes:[['Bryggan','Längre & tryggare']],model:'swiper_quad_yellow'};
  useLanguage('es');
  try{translateData(level)}finally{useLanguage('sv')}
  assert.equal(level.name,'Puerta del Cucú');
  assert.deepEqual(level.title,['PUERTA','DEL CUCÚ']);
  assert.deepEqual(level.labels,[['SALIDA',-16,0]]);
  assert.deepEqual(level.routes,[['El Muelle','Más largo y seguro']]);
  assert.equal(level.recordKey,'minimayhem-clockwork-1');assert.equal(level.theme,'clockwork');assert.equal(level.model,'swiper_quad_yellow');
});
