FROM python:3.12-slim
WORKDIR /app
COPY . /app
RUN pip install --upgrade pip && pip install -r requirements.txt
RUN pip install supervisor
RUN pip install fake_useragent
COPY supervisord.conf /etc/supervisord.conf
EXPOSE 8000
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
