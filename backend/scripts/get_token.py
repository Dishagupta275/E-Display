import requests

resp = requests.post('http://127.0.0.1:5000/api/auth/login', json={'email':'principal@edisplay.com','password':'Principal@123'})
if resp.status_code == 200:
    data = resp.json()
    print(data['access_token'])
else:
    print('ERROR', resp.status_code, resp.text)
