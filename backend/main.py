from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from constants import SERVER_URL, PORT, ENV
from apps.calculator.route import calculator_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    return {'message': "Server is running"}

app.include_router(calculator_router, prefix='/solve', tags=['Calculate'])

if __name__ == "__main__":
    uvicorn.run('main:app', host=SERVER_URL,
                port=int(8900), reload=(ENV == "dev"))
