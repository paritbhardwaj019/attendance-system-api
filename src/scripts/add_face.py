import requests
from requests.auth import HTTPDigestAuth
import sys
import json

id = sys.argv[1]  
photo_path = sys.argv[2] 

url = "http://43.224.222.244:85/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json&devIndex=20F57640-5C66-49B3-86D5-750E856BEA4A"

payload = {
    'data': json.dumps({"FaceInfo": {"employeeNo": id}}) 
}

files = [
    ('FaceDataRecord', (photo_path, open(photo_path, 'rb'), 'image/jpeg'))  
]

headers = {}

response = requests.post(
    url,
    headers=headers,
    data=payload,
    files=files,
    auth=HTTPDigestAuth('admin', 'Dhiraj@2024')  
)

print(response.text)