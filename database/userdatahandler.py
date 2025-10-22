from datetime import datetime, timedelta, timezone
# import re
# import bcrypt
from flask import session
from database import databaseConfig
import requests
import os

beehive_image_collection = databaseConfig.get_beehive_image_collection()
beehive_notification_collection = databaseConfig.get_beehive_notification_collection()

# Get user by username from MongoDB
def get_user_by_username(username: str):
    query = {
        "username": username
    }
    user = beehive_user_collection.find_one(query)
    return user


# Save image to MongoDB
def save_image(id, filename, filetype, title, description, time_created, audio_filename=None, sentiment=None):
    image = {
        'user_id': id,
        'filename': filename,
        'filetype': filetype,
        'title': title,
        'description': description,
        'created_at': time_created,
        'audio_filename': audio_filename,
        'sentiment': sentiment
    }
    beehive_image_collection.insert_one(image)

# Count all images from MongoDB
def total_images():
    return beehive_image_collection.count_documents({})

# Count all images from MongoDB uploaded today
def todays_images():
    last_24_hours = datetime.now() - timedelta(hours=24)
    recent_images_count = beehive_image_collection.count_documents({
        "created_at": {"$gte": last_24_hours}
    })
    return recent_images_count

def getallusers():
    users = beehive_user_collection.find()
    return users

def get_currentuser_from_session():
    user_data = session.get('user')
    if user_data is None:
        return None

    user_id = user_data.get('user_id')
    if not user_id:
        return None

    user = beehive_user_collection.find_one({'_id': user_id})
    return user

# Get all images from MongoDB
def get_images_by_user(user_id):
    images = beehive_image_collection.find({'user_id': user_id})
    return [{
        'id': str(image['_id']),
        'filename': image['filename'],
        'title': image['title'],
        'description': image['description'],
        'audio_filename': image.get('audio_filename', ""),
        'sentiment': image.get('sentiment', ""),
        'created_at': image['created_at']['$date'] if isinstance(image.get('created_at'), dict) else image.get('created_at')
    } for image in images]

# Get images by sentiments list from MongoDB ( Route to be used with the dreams prototype for analysis page)
# def get_images_by_sentiments(username, sentiment_list, match_all):
#     if match_all:
#         # Match all tags (AND logic)
#         query = {
#             "username": username,
#             "$and": [{"sentiment": {"$regex": tag, "$options": "i"}} for tag in sentiment_list]
#         }
#     else:
#         # Match any tag (OR logic)
#         query = {
#             "username": username,
#             "$or": [{"sentiment": {"$regex": tag, "$options": "i"}} for tag in sentiment_list]
#         }

#     images = beehive_image_collection.find(query)
#     return [{'id': str(image['_id']),
#              'filename': image['filename'],
#              'title': image['title'],
#              'description': image['description'],
#              'audio_filename': image.get('audio_filename', ""),
#              'sentiment': image.get('sentiment', "")} for image in images]

# Update image in MongoDB
def update_image(image_id, title, description, sentiment=None):
    update_data = {
        'title': title,
        'description': description
    }

    # Only include sentiment in the update if it is provided by the user
    if sentiment is not None:
        update_data['sentiment'] = sentiment

    beehive_image_collection.update_one(
        {'_id': image_id},
        {'$set': update_data}
    )

# Delete image from MongoDB
def delete_image(image_id):
    beehive_image_collection.delete_one({'_id': image_id})

# Get image by ID from MongoDB
def get_image_by_id(image_id):
    image = beehive_image_collection.find_one({'_id': image_id})
    return image

# Get upload statistics for admin dashboard
def get_upload_stats():
    """Get statistics for admin dashboard including total users, images, and voice notes."""
    try:
        # Count total images
        total_images = beehive_image_collection.count_documents({})

        # Count voice notes (images with audio_filename)
        total_voice_notes = beehive_image_collection.count_documents({
            "audio_filename": {"$exists": True, "$ne": None}
        })

        return {
            'totalImages': total_images,
            'totalVoiceNotes': total_voice_notes,
            'totalMedia': total_images + total_voice_notes
        }
    except Exception as e:
        print(f"Error getting upload stats: {str(e)}")
        return {
            'totalImages': 0,
            'totalVoiceNotes': 0,
            'totalMedia': 0
        }

# Get recent uploads for admin dashboard
def get_recent_uploads(limit=10):
    """Get recent uploads with user information from Clerk for admin dashboard."""
    try:
        #  Get recent uploads sorted by creation date
        recent_uploads = list(beehive_image_collection.find().sort(
            'created_at', -1).limit(limit))
        if not recent_uploads:
            return []

        user_ids = list({str(upload.get('user_id'))
                        for upload in recent_uploads if upload.get('user_id')})

        clerk_api_key = os.getenv('CLERK_SECRET_KEY')
        headers = {'Authorization': f'Bearer {clerk_api_key}'}

        response = requests.get(
            'http://127.0.0.1:5000/api/admin/users',
            headers=headers,
            params={'query': ','.join(user_ids), 'limit': len(user_ids)}
        )
        users_data = response.json().get('users', []) if response.ok else []
        # map of user_id to user info
        user_map = {user['id']: user for user in users_data}

        # uploads list with user info
        uploads_list = []
        for upload in recent_uploads:
            user_id = str(upload.get('user_id'))
            user = user_map.get(user_id)
            user_name = user['name'] if user else 'Unknown User'
            uploads_list.append({
                'id': str(upload['_id']),
                'title': upload.get('title', ''),
                'user': user_name,
                'user_id': user_id,
                'timestamp': upload['created_at']['$date'] if isinstance(upload.get('created_at'), dict) else upload.get('created_at'),
                'description': upload.get('description', ''),
                'filename': upload.get('filename', ''),
                'audio_filename': upload.get('audio_filename', ''),
                'sentiment': upload.get('sentiment', '')
            })
        return uploads_list
    except Exception as e:
        print(f"Error getting recent uploads: {str(e)}")
        return []


def save_notification(user_id, username, filename, title, time_created, sentiment):
    # Insert notification for admin
    notification = {
        "type": "image_upload",
        "user_id": user_id,
        "username": username,
        "image_filename": filename,
        "title": title,
        "timestamp": time_created,
        "seen": False
    }
    beehive_notification_collection.insert_one(notification)


def get_all_users():
    users = beehive_user_collection.find({}, {'_id': 1, 'username': 1})
    return list(users)


def get_uploads_analytics_summary():
    try:
        # --- Calculate Date Ranges (UTC) ---
        today = datetime.utcnow()
        start_of_this_month = today.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_last_month = start_of_this_month - timedelta(seconds=1)
        start_of_last_month = end_of_last_month.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0)

        # --- MongoDB Aggregation Pipeline ---
        pipeline = [
            {
                '$facet': {
                    'sentiments': [{'$group': {'_id': '$sentiment', 'count': {'$sum': 1}}}],
                    'content_types': [{'$group': {'_id': '$filetype', 'count': {'$sum': 1}}}],
                    'voice_notes': [{'$match': {'audio_filename': {'$ne': None}}}, {'$count': 'count'}],
                    'total_uploads': [{'$count': 'count'}],
                    'this_month_uploads': [
                        {'$match': {'created_at': {'$gte': start_of_this_month}}},
                        {'$count': 'count'}
                    ],
                    'last_month_uploads': [
                        {'$match': {'created_at': {
                            '$gte': start_of_last_month, '$lt': start_of_this_month}}},
                        {'$count': 'count'}
                    ]
                }
            }
        ]

        result = list(beehive_image_collection.aggregate(pipeline))
        if not result or not result[0]['total_uploads']:
            return {
                'total_uploads': 0,
                'monthly_increase_percentage': 0,
                'content_distribution': {'image': 0, 'document': 0, 'other': 0},
                'sentiments': {'positive': 0, 'negative': 0, 'neutral': 0},
                'voice_notes': 0
            }

        data = result[0]

        # --- Monthly Counts ---
        this_month_count = data['this_month_uploads'][0]['count'] if data.get(
            'this_month_uploads') else 0
        last_month_count = data['last_month_uploads'][0]['count'] if data.get(
            'last_month_uploads') else 0

        # --- Percentage Increase ---
        increase_percentage = 0.0
        if last_month_count > 0:
            increase_percentage = round(
                ((this_month_count - last_month_count) / last_month_count) * 100, 2)
        elif this_month_count > 0:
            increase_percentage = 100.0

        # --- Process File and Sentiment Counts ---
        sentiment_counts = {item['_id']: item['count']
                            for item in data.get('sentiments', []) if item['_id']}
        file_counts = {item['_id']: item['count']
                       for item in data.get('content_types', []) if item['_id']}
        total_uploads = data['total_uploads'][0]['count']
        image_count = file_counts.get('image', 0)
        document_count = file_counts.get('document', 0)
        voice_notes_count = data['voice_notes'][0]['count'] if data.get(
            'voice_notes') else 0

        # --- Final Summary ---
        known_sentiments = {'positive', 'negative', 'neutral'}
        custom_count = sum(
            count for sentiment, count in sentiment_counts.items()
            if sentiment not in known_sentiments
        )

        return {
            'total': total_uploads,
            'breakdown': {
                'images': image_count,
                'documents': document_count,
                'others': total_uploads - (image_count + document_count)
            },
            'voiceNotes': voice_notes_count,
            'increase': increase_percentage,
            'timeframe': 'This month',
            'sentimentAnalysis': {
                'positive': sentiment_counts.get('positive', 0),
                'negative': sentiment_counts.get('negative', 0),
                'neutral': sentiment_counts.get('neutral', 0),
                'custom': custom_count
            },
        }

    except Exception as e:
        print(f"Error getting analytics summary: {e}")
        return None

def get_user_analytics_summary():
    try:
        clerk_api_key = os.getenv('CLERK_SECRET_KEY')
        if not clerk_api_key:
            raise ValueError("CLERK_SECRET_KEY environment variable not set.")

        headers = {'Authorization': f'Bearer {clerk_api_key}'}
        base_url = 'https://api.clerk.com/v1/users'

        # --- Only fetch users created or active within last 60 days ---
        today = datetime.now(timezone.utc)
        date_60_days_ago = today - timedelta(days=60)
        created_after_ms = int(date_60_days_ago.timestamp() * 1000)

        # --- Paginated Fetch ---
        all_users = []
        limit, offset = 200, 0

        while True:
            params = {
                'limit': limit,
                'offset': offset,
                'order_by': '-created_at',          # newest first
                'created_at_after': created_after_ms
            }

            response = requests.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            users_page = response.json()

            if not users_page:
                break

            all_users.extend(users_page)
            offset += limit

            # Stop if oldest user in this batch is older than 60 days
            oldest_user = users_page[-1]
            if oldest_user.get('created_at', 0) < created_after_ms:
                break

        # --- Date Ranges ---
        start_of_this_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_last_month = start_of_this_month
        start_of_last_month = (end_of_last_month.replace(day=1) - timedelta(days=1)).replace(day=1)
        active_threshold = today - timedelta(days=30)

        # --- Metrics ---
        total_users = len(all_users)
        active_users_total = new_users_this_month = new_users_last_month = 0
        active_users_this_month = active_users_last_month = 0

        for user in all_users:
            created_at = datetime.fromtimestamp(user.get('created_at', 0) / 1000, tz=timezone.utc)
            last_sign_in_at = datetime.fromtimestamp(user.get('last_sign_in_at', 0) / 1000, tz=timezone.utc)

            if start_of_this_month <= created_at:
                new_users_this_month += 1
            elif start_of_last_month <= created_at < start_of_this_month:
                new_users_last_month += 1

            if last_sign_in_at >= active_threshold:
                active_users_total += 1
            if start_of_this_month <= last_sign_in_at:
                active_users_this_month += 1
            elif start_of_last_month <= last_sign_in_at < start_of_this_month:
                active_users_last_month += 1

        # --- Percentage Increases ---
        total_users_increase = (
            round(((new_users_this_month - new_users_last_month) / new_users_last_month) * 100, 2)
            if new_users_last_month > 0 else (100.0 if new_users_this_month > 0 else 0.0)
        )
        active_users_increase = (
            round(((active_users_this_month - active_users_last_month) / active_users_last_month) * 100, 2)
            if active_users_last_month > 0 else (100.0 if active_users_this_month > 0 else 0.0)
        )

        return {
            'users': {'total': total_users, 'increase': total_users_increase},
            'activeUsers': {'total': active_users_total, 'increase': active_users_increase},
            'timeframe': 'This month'
        }

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from Clerk API: {e}")
        return None
    except Exception as e:
        print(f"An error occurred in user analytics: {e}")
        return None


def get_daily_upload_trend(days_ago=7):
    try:
        today_utc = datetime.utcnow().replace(tzinfo=timezone.utc, hour=0,
                                              minute=0, second=0, microsecond=0)
        start_date_utc = today_utc - timedelta(days=days_ago - 1)

        # --- Aggregate Daily Uploads ---
        pipeline = [
            {'$match': {'created_at': {'$gte': start_date_utc}}},
            {'$group': {'_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$created_at', 'timezone': 'UTC'}},
                        'total_uploads': {'$sum': 1}}}
        ]
        daily_counts = list(beehive_image_collection.aggregate(pipeline))
        upload_map = {item['_id']: item['total_uploads'] for item in daily_counts}

        final_trend = []
        prev_count = 0
        current_date = start_date_utc

        # --- Generate Continuous Daily Data ---
        while current_date <= today_utc:
            date_str = current_date.strftime('%Y-%m-%d')
            count = upload_map.get(date_str, 0)

            increase = 0.0
            if prev_count > 0:
                increase = round(((count - prev_count) / prev_count) * 100, 2)
            elif count > 0:
                increase = 100.0

            final_trend.append({'date': date_str, 'uploads': {
                               'total': count, 'increase': increase}})
            prev_count = count
            current_date += timedelta(days=1)

        return final_trend

    except Exception as e:
        print(f"Error getting daily upload trend: {e}")
        return []


def get_daily_user_trend(days_ago=7):
    try:
        clerk_api_key = os.getenv('CLERK_SECRET_KEY')
        if not clerk_api_key:
            raise ValueError("CLERK_SECRET_KEY environment variable not set.")

        headers = {'Authorization': f'Bearer {clerk_api_key}'}
        base_url = 'https://api.clerk.com/v1/users'

        today_utc = datetime.utcnow().replace(tzinfo=timezone.utc, hour=0, minute=0, second=0, microsecond=0)
        start_date_utc = today_utc - timedelta(days=days_ago - 1)
        created_after_ms = int(start_date_utc.timestamp() * 1000)

        # --- Paginated Fetch (only recent users) ---
        all_users = []
        limit, offset = 200, 0
        while True:
            params = {
                'limit': limit,
                'offset': offset,
                'order_by': '-created_at',
                'created_at_after': created_after_ms
            }
            response = requests.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            users_page = response.json()
            if not users_page:
                break

            all_users.extend(users_page)
            offset += limit

            # Stop if oldest user in this batch is older than given days
            oldest_user = users_page[-1]
            if oldest_user.get('created_at', 0) < created_after_ms:
                break

        # --- Prepare Date Scaffold ---
        new_users_map = {}
        active_users_map = {}
        current_date = start_date_utc
        while current_date <= today_utc:
            date_str = current_date.strftime('%Y-%m-%d')
            new_users_map[date_str] = 0
            active_users_map[date_str] = 0
            current_date += timedelta(days=1)

        # --- Populate Counts ---
        for user in all_users:
            created_at_str = datetime.fromtimestamp(user.get('created_at', 0) / 1000, tz=timezone.utc).strftime('%Y-%m-%d')
            last_sign_in_str = datetime.fromtimestamp(user.get('last_sign_in_at', 0) / 1000, tz=timezone.utc).strftime('%Y-%m-%d')

            if created_at_str in new_users_map:
                new_users_map[created_at_str] += 1
            if last_sign_in_str in active_users_map:
                active_users_map[last_sign_in_str] += 1

        # --- Compute Trends ---
        final_trend, prev_new, prev_active = [], 0, 0
        for date_str in sorted(new_users_map.keys()):
            new_count = new_users_map[date_str]
            active_count = active_users_map[date_str]

            new_increase = round(((new_count - prev_new) / prev_new) * 100, 2) if prev_new > 0 else (100.0 if new_count > 0 else 0.0)
            active_increase = round(((active_count - prev_active) / prev_active) * 100, 2) if prev_active > 0 else (100.0 if active_count > 0 else 0.0)

            final_trend.append({
                'date': date_str,
                'users': {'total': new_count, 'increase': new_increase},
                'activeUsers': {'total': active_count, 'increase': active_increase},
            })

            prev_new, prev_active = new_count, active_count

        return final_trend

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from Clerk API: {e}")
        return []
    except Exception as e:
        print(f"An error occurred in user daily trend: {e}")
        return []
