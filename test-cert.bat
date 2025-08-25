@echo off
"C:\Program Files\Git\mingw64\bin\openssl.exe" pkcs12 -in "C:\ios-certs\ios_distribution.pfx" -passin "pass:xKmne29v&&TKrhv^^$s3j" -noout
echo Exit Code: %ERRORLEVEL%