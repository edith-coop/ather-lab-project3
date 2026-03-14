FROM node:20.14.0-alpine

WORKDIR /usr/src/app

# Cài đặt công cụ build và dev
RUN npm install -g @nestjs/cli ts-node typescript tsconfig-paths

# Cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy mã nguồn
COPY . .

EXPOSE 3000

# Chạy trực tiếp từ file gốc bằng ts-node (Nhanh nhất & dễ chạy nhất)
CMD ["npm", "run", "start:docker"]
