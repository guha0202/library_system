from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Publisher, Author, Category, Book, Reader, Borrow

# 定义一个内联 admin，将 Reader 信息嵌入到 User 页面中
class ReaderInline(admin.StackedInline):
    model = Reader
    can_delete = False
    verbose_name_plural = '读者信息'

# 定义新的 User admin
class UserAdmin(BaseUserAdmin):
    inlines = (ReaderInline,)
    list_display = ('username', 'email', 'first_name', 'is_staff', 'get_phone_number')
    
    def get_phone_number(self, instance):
        return instance.reader.phone_number
    get_phone_number.short_description = '电话号码'

# 重新注册 User 模型
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

# Register your models here.
admin.site.register(Publisher)
admin.site.register(Author)
admin.site.register(Category)
admin.site.register(Book)
admin.site.register(Reader)
admin.site.register(Borrow)
