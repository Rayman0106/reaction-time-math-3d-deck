"""Verify the curated source inventory; standard library only."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'docs/SOURCE-MANIFEST.json').read_text(encoding='utf-8'))
issues=[]
for name,item in manifest.items():
 path=root/name
 if not path.is_file():issues.append(name+': missing');continue
 if path.stat().st_size!=item['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:issues.append(name+': changed')
print(json.dumps({'pass':not issues,'files':len(manifest),'issues':issues},indent=2))
raise SystemExit(1 if issues else 0)
