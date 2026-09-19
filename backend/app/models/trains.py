from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class Train(Base):
    __tablename__ = "trains"

    train_number = Column(String(20), primary_key=True)
    train_id = Column(String(50), unique=True, nullable=False)
    train_name = Column(String(150), nullable=False)
    train_type = Column(String(50), nullable=False) # VANDE_BHARAT, SHATABDI, SUPERFAST, MAIL_EXPRESS, EXPRESS, FREIGHT
    service_type = Column(String(30), default="PASSENGER") # PASSENGER, FREIGHT
    origin = Column(String(50), nullable=False)
    destination = Column(String(50), nullable=False)
    route = Column(Text, nullable=True)
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    direction = Column(String(20), default="UP") # UP, DOWN
    priority = Column(Integer, default=2) # 1 (Highest) to 5
    source_type = Column(String(30), default="REAL_PUBLIC") # REAL_PUBLIC, SYNTHETIC
    cargo_type = Column(String(50), nullable=True) # COAL, AUTOMOBILES, CONTAINERS, CEMENT, FOOD_GRAINS

    schedules = relationship("TrainSchedule", back_populates="train", order_by="TrainSchedule.sequence")
    movement = relationship("TrainMovement", back_populates="train", uselist=False)
    events = relationship("TrainEvent", back_populates="train", order_by="TrainEvent.timestamp.desc()")


class TrainSchedule(Base):
    __tablename__ = "train_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), ForeignKey("trains.train_number"))
    station_code = Column(String(20), ForeignKey("stations.code"))
    station_name = Column(String(120), nullable=False)
    sequence = Column(Integer, default=1)
    scheduled_arrival = Column(String(10), nullable=False) # "HH:MM"
    scheduled_departure = Column(String(10), nullable=False) # "HH:MM"
    halt_minutes = Column(Integer, default=2)
    km_from_origin = Column(Float, default=0.0)

    train = relationship("Train", back_populates="schedules")


class TrainMovement(Base):
    __tablename__ = "train_movements"

    id = Column(String(50), primary_key=True)
    train_number = Column(String(20), ForeignKey("trains.train_number"), unique=True)
    current_location = Column(String(120), nullable=False) # e.g. "Between Vidisha and Gulabganj" or "Bhopal Jn"
    current_station_code = Column(String(20), nullable=True)
    current_section_id = Column(String(50), nullable=True)
    current_track = Column(String(50), default="DOWN_MAIN")
    current_km = Column(Float, default=0.0)
    direction = Column(String(20), default="DOWN")
    speed_kmph = Column(Float, default=80.0)

    scheduled_time = Column(String(10), default="12:00")
    estimated_time = Column(String(10), default="12:00")
    delay_minutes = Column(Integer, default=0)
    delay_category = Column(String(30), default="ON_TIME") # ON_TIME, MINOR, MODERATE, HEAVY, SEVERE

    status = Column(String(50), default="RUNNING")
    # States: RUNNING, SCHEDULED_HALT, UNSCHEDULED_HALT, HELD, DELAYED, WAITING_FOR_PATH, MAINTENANCE_HOLD, DIVERTED, RESCHEDULED, CANCELLED

    hold_location = Column(String(100), nullable=True)
    hold_reason = Column(String(255), nullable=True)
    hold_start_time = Column(String(10), nullable=True)
    hold_end_time = Column(String(10), nullable=True)

    source_type = Column(String(50), default="SIMULATED") # SIMULATED, ESTIMATED, REAL_PUBLIC
    updated_at = Column(DateTime, default=datetime.utcnow)

    train = relationship("Train", back_populates="movement")


class TrainEvent(Base):
    __tablename__ = "train_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), ForeignKey("trains.train_number"))
    event_type = Column(String(50), nullable=False) # DEPARTURE, PASSING, ARRIVAL, HOLD_START, HOLD_RELEASE, DELAY_INCURRED
    location = Column(String(120), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(String(255), nullable=True)
    source_type = Column(String(50), default="SIMULATED")

    train = relationship("Train", back_populates="events")
