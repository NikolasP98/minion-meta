import sys,subprocess,time,json,pathlib,os
root=pathlib.Path(__file__).parent
name=sys.argv[1];argv=sys.argv[2:];started=time.time()
with (root/(name+".log")).open("w") as log:
 result=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT)
record={"name":name,"argv":argv,"cwd":str(pathlib.Path.cwd()),"exitCode":result.returncode,"seconds":round(time.time()-started,3),"log":str(root/(name+".log"))}
(root/(name+".json")).write_text(json.dumps(record,indent=2)+"\n")
print(json.dumps(record));print((root/(name+".log")).read_text()[-3500:]);sys.exit(result.returncode)
