import {describe,it,expect} from 'vitest';
import {supportOptions} from '../src/troops.ts';
import {recommendExpeditionSupport,recommendedSupport,physicalMatchup,supportWarnings,troopAdvice} from '../src/troop-tactics.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {Session} from '../src/session.ts';
import {makeUnit,type UnitClass} from '../../core/src/index.ts';
function trial(kind:UnitClass){const d=deployment(freshCampaign(),true);d.mission={id:'T01',runId:'tactics-'+kind,version:2,supportClasses:[kind,'fengshui']};return new Session(7,'normal',215,'survival',4,d);}
describe('usable troop formations',()=>{
 it.each(supportOptions)('deploys and restores selectable %s',kind=>{const s=trial(kind),u=s.state.living('ally').find(u=>u.unitClass===kind);expect(u).toBeDefined();expect(troopAdvice[kind]).toBeTruthy();expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());});
 it('gives manually selected rams their siege and no-counter traits',()=>{expect(trial('ram').state.living('ally').find(u=>u.unitClass==='ram')!.traits).toEqual(expect.arrayContaining(['siegeRam','noCounterAttack']));});
 it('prioritizes holding and healing for defense and escape for rescue',()=>{for(const id of ['T03','T06','Q05','Q11'])expect(recommendExpeditionSupport(id).classes).toEqual(['spearman','fengshui']);expect(recommendExpeditionSupport('T02').classes).toEqual(['bandit','fengshui']);expect(recommendExpeditionSupport('Q03').classes).toEqual(['monk','fengshui']);expect(recommendExpeditionSupport('Q02')).toEqual(recommendedSupport.fort);});
 it('recommends only deployable land troops',()=>{for(const r of Object.values(recommendedSupport)){expect(r.classes).toHaveLength(2);for(const c of r.classes)expect(supportOptions).toContain(c);}expect(supportOptions).not.toContain('navy');});
 it('uses the actual physical matchup including specialized troop families',()=>{expect(physicalMatchup('spearman','horseArcher')).toContain('1.50');expect(physicalMatchup('cavalry','spearman')).toContain('0.60');});
 it('checks recovery based on learned skills and ranged attacks based on actual range',()=>{const u=makeUnit({id:'a',side:'ally',unitClass:'infantry',level:1,pos:{x:0,y:0}});expect(supportWarnings([u])).toHaveLength(2);u.strategies=['mend'];u.range=[2,3];expect(supportWarnings([u])).toEqual([]);});
});
