import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

try:
    with psycopg2.connect(            #sycopg2 es usado para crear coneccion entre python y base de datos PosgreSQL       
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
    ) as conn:                            #conn representa la coneccion a la base de datos 

        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM guests")
            data = cursor.fetchall()

            for d in data:
                print(d)

except Exception as error:
    print(f"An error occurred: {error}")

 

