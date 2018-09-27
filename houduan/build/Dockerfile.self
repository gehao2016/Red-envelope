FROM scratch

COPY ./dist /

WORKDIR /opt/grabRedEnvelopes

CMD ["./grabRedEnvelopes"]

