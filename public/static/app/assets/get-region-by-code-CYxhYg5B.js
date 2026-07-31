function i(r,n){const o=r.reduceRight((e,t)=>(e[t.phoneCode]=t,e),{});for(let e=n.length;e>0;e--){const t=n.slice(0,Math.max(0,e));if(o[t])return o[t]}}export{i as g};
