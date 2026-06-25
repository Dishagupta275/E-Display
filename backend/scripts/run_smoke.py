import requests

login = requests.post('https://e-dispy.onrender.com/api/auth/login', json={'email':'principal@edisplay.com','password':'Principal@123'})
if login.status_code!=200:
    print('Login failed', login.status_code, login.text)
    raise SystemExit(1)

token = login.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

print('AUTH_ME:', requests.get('https://e-dispy.onrender.com/api/auth/me', headers=headers).status_code)
print(requests.get('https://e-dispy.onrender.com/api/auth/me', headers=headers).text)

print('DEPARTMENTS:', requests.get('https://e-dispy.onrender.com/api/departments', headers=headers).status_code)
print(requests.get('https://e-dispy.onrender.com/api/departments', headers=headers).text)
