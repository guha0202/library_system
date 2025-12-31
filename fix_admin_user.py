import os
import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_system.settings')
django.setup()

from django.contrib.auth.models import User

def fix_admin_user():
    username = 'randi'
    password = '020202'  # 使用您熟悉的数据库密码作为登录密码
    
    try:
        user = User.objects.get(username=username)
        print(f"用户 '{username}' 已存在。")
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"用户 '{username}' 的密码已重置为 '{password}'，并确保其拥有管理员权限。")
    except User.DoesNotExist:
        print(f"用户 '{username}' 不存在。正在创建...")
        User.objects.create_superuser(username=username, email='randi@example.com', password=password)
        print(f"超级用户 '{username}' 已创建，密码为 '{password}'。")

if __name__ == '__main__':
    fix_admin_user()
