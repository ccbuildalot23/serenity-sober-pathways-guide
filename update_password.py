#!/usr/bin/env python3
import subprocess
import sys

# The exact password with special characters
password = r"xKmne29v&&TKrhv^$s3j"

# Update GitHub secret
process = subprocess.Popen(
    ["gh", "secret", "set", "IOS_CERTIFICATE_PASSWORD", "--repo", "ccbuildalot23/serenity-sober-pathways-guide"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = process.communicate(input=password)

if process.returncode == 0:
    print("Password updated successfully!")
else:
    print(f"Failed to update password: {stderr}")
    sys.exit(1)