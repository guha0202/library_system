import pymysql

# 伪造版本号，骗过 Django 的检查
pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.install_as_MySQLdb()
