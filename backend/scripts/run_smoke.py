import requests

login = requests.post('http://127.0.0.1:5000/api/auth/login', json={'email':'principal@edisplay.com','password':'Principal@123'})
if login.status_code!=200:
    print('Login failed', login.status_code, login.text)
    raise SystemExit(1)

token = login.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

print('AUTH_ME:', requests.get('http://127.0.0.1:5000/api/auth/me', headers=headers).status_code)
print(requests.get('http://127.0.0.1:5000/api/auth/me', headers=headers).text)

print('DEPARTMENTS:', requests.get('http://127.0.0.1:5000/api/departments', headers=headers).status_code)
print(requests.get('http://127.0.0.1:5000/api/departments', headers=headers).text)
