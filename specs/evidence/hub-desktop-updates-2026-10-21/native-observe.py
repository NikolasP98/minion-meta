# Passive Linux installed-update observer. Never reads profile contents or writes the executable.
# TODO(handoff): Add native accessibility assertions after investigating the
# AppImage AT-SPI-triggered SIGABRT on this host. Coordinate-based qualification
# uses NO_AT_BRIDGE=1 for this transient test session only. Tracked in
# proposals/2026-10-21-hub-desktop-updates.md, Native accessibility compatibility.
import pathlib,json,subprocess,time,hashlib,datetime,os
p=pathlib.Path(__file__).parent
app=pathlib.Path('/home/nikolas/AppImages/minion_hub.appimage')
launcher=pathlib.Path('/home/nikolas/.local/share/applications/minion_hub.desktop')
profile=pathlib.Path('/home/nikolas/.local/share/app.minionhub.desktop')
end=time.monotonic()+240
last=None
with (p/'runtime-events.jsonl').open('a') as f:
 while time.monotonic()<end:
  try:
   windows=json.loads(subprocess.check_output(['hyprctl','-j','clients']))
   windows=[{k:x.get(k) for k in ['pid','title','address']} for x in windows if x.get('class')=='minion-hub-desktop']
   stat=app.stat()
   state={'windows':windows,'inode':stat.st_ino,'size':stat.st_size,'mtime_ns':stat.st_mtime_ns,'mode':oct(stat.st_mode&0o777),'profile_inode':profile.stat().st_ino}
   if state!=last:
    state['capturedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    state['installedSha256']=hashlib.sha256(app.read_bytes()).hexdigest()
    state['launcherSha256']=hashlib.sha256(launcher.read_bytes()).hexdigest()
    f.write(json.dumps(state)+'\n');f.flush();print(json.dumps(state),flush=True)
    last={k:v for k,v in state.items() if k not in ['capturedAt','installedSha256','launcherSha256']}
  except Exception as e:
   print(type(e).__name__,flush=True)
  time.sleep(.25)
