import { useEffect, useState } from 'react';
import { connectedGamepads, padFamily } from './gamepad.js';

export function useGamepads() {
  const [pads,setPads]=useState([null,null]);
  useEffect(()=>{
    let signature='';
    const refresh=()=>{
      const next=connectedGamepads().map(p=>p?{index:p.index,id:p.id,family:padFamily(p.id)}:null);
      const key=JSON.stringify(next);
      if(key!==signature){signature=key;setPads(next);}
    };
    refresh();
    window.addEventListener('gamepadconnected',refresh);
    window.addEventListener('gamepaddisconnected',refresh);
    const timer=setInterval(refresh,150);
    return ()=>{clearInterval(timer);window.removeEventListener('gamepadconnected',refresh);window.removeEventListener('gamepaddisconnected',refresh);};
  },[]);
  return pads;
}
