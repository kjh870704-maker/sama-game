/** 받침에 맞는 조사: 「태평청령서」를 · 「연의」로 · 「길」로(ㄹ 받침은 '로'). 한글이 아니면 받침 없는 쪽을 쓴다. */
const tail=(word:string)=>{const c=word.trim().replace(/[」』)\]\s]+$/,'').slice(-1).charCodeAt(0);return c>=0xac00&&c<=0xd7a3?(c-0xac00)%28:0;};
export const 을를=(word:string)=>word+(tail(word)?'을':'를');
export const 이가=(word:string)=>word+(tail(word)?'이':'가');
export const 은는=(word:string)=>word+(tail(word)?'은':'는');
export const 으로=(word:string)=>{const t=tail(word);return word+(t&&t!==8?'으로':'로');};
export const 과와=(word:string)=>word+(tail(word)?'과':'와');
