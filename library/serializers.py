from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Book, Author, Publisher, Category, Borrow

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

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
        fields = ['id', 'title', 'isbn', 'publisher', 'authors', 'categories', 'publication_date', 'summary', 'quantity', 'user_status']

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
