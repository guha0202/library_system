from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Book, Author, Publisher, Category, Borrow, Reader

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(source='reader.phone_number', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'is_staff', 'phone_number')
        read_only_fields = ('is_staff',)

    def create(self, validated_data):
        # 提取 phone_number
        # 注意：由于使用了 source='reader.phone_number'，DRF 会将数据放入 reader 字典中
        reader_data = validated_data.pop('reader', {})
        phone_number = reader_data.get('phone_number', '')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', '')
        )
        
        # 更新自动创建的 Reader 对象
        if phone_number:
            # 确保 reader 存在 (虽然信号应该已经创建了它)
            if not hasattr(user, 'reader'):
                Reader.objects.create(user=user)
            user.reader.phone_number = phone_number
            user.reader.save()
            
        return user

    def update(self, instance, validated_data):
        # 处理 reader 数据
        reader_data = validated_data.pop('reader', {})
        phone_number = reader_data.get('phone_number')

        # 更新 User 字段
        instance.email = validated_data.get('email', instance.email)
        # 如果提供了密码，则更新密码
        password = validated_data.get('password')
        if password:
            instance.set_password(password)
        instance.save()

        # 更新 Reader 字段
        if phone_number is not None:
            # 确保 reader 存在
            if not hasattr(instance, 'reader'):
                Reader.objects.create(user=instance)
            instance.reader.phone_number = phone_number
            instance.reader.save()

        return instance

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name', 'bio']

class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = ['id', 'name']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class BookSerializer(serializers.ModelSerializer):
    # 嵌套序列化：直接显示作者和出版社的详细信息，而不是只显示 ID
    authors = AuthorSerializer(many=True, read_only=True)
    publisher = PublisherSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    
    # 新增字段：用户状态
    user_status = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ['id', 'title', 'isbn', 'publisher', 'authors', 'categories', 'publication_date', 'summary', 'quantity', 'user_status', 'cover_image']

    def get_user_status(self, obj):
        """
        计算当前用户对这本书的状态：
        - BORROWED: 已借阅且未还
        - AVAILABLE: 未借阅且有库存
        - NO_STOCK: 未借阅但无库存
        """
        # 获取当前请求的用户
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user = request.user
            # 检查是否有未归还的借阅记录
            has_borrowed = Borrow.objects.filter(
                reader=user, 
                book=obj, 
                return_date__isnull=True
            ).exists()

            if has_borrowed:
                return 'BORROWED'
        
        # 如果未登录或未借阅，则只看库存
        if obj.quantity > 0:
            return 'AVAILABLE'
        else:
            return 'NO_STOCK'

class BorrowSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Borrow
        fields = ['id', 'book', 'borrow_date', 'due_date', 'return_date', 'status', 'is_overdue']

    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.return_date is None and obj.due_date < timezone.now().date():
            return True
        return False
