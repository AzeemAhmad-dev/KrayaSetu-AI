from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Division(Base):
    __tablename__ = "divisions"

    id = Column(String(30), primary_key=True, default="BPL-DIV")
    name = Column(String(100), nullable=False)
    zone = Column(String(100), default="West Central Railway (WCR)")
    headquarters = Column(String(100), default="Rani Kamalapati, Bhopal")
    established = Column(String(20), default="1952-04-01")

    corridors = relationship("Corridor", back_populates="division")


class Corridor(Base):
    __tablename__ = "corridors"

    id = Column(String(30), primary_key=True)
    division_id = Column(String(30), ForeignKey("divisions.id"))
    name = Column(String(120), nullable=False)
    code = Column(String(50), nullable=False)
    type = Column(String(50), default="TRUNK_MAIN") # TRUNK_MAIN, TRUNK_FEEDER, BRANCH_LINE
    track_configuration = Column(String(50), default="DOUBLE_LINE") # TRIPLE_LINE, DOUBLE_LINE, SINGLE_LINE
    electrified = Column(Boolean, default=True)
    voltage = Column(String(30), default="25 kV AC")
    max_permissible_speed_kmph = Column(Integer, default=130)
    total_distance_km = Column(Float, default=0.0)
    description = Column(Text, nullable=True)

    division = relationship("Division", back_populates="corridors")
    corridor_stations = relationship("CorridorStation", back_populates="corridor", order_by="CorridorStation.km_chainage")
    sections = relationship("Section", back_populates="corridor", order_by="Section.start_km")


class Station(Base):
    __tablename__ = "stations"

    code = Column(String(20), primary_key=True)
    name = Column(String(120), nullable=False)
    category = Column(String(50), default="MINOR_STATION") # JUNCTION, MAJOR_STATION, MINOR_STATION, HALT, LOOP_LOCATION, YARD
    is_major = Column(Boolean, default=False)
    platforms = Column(Integer, default=2)
    loop_lines = Column(Integer, default=1)
    sidings = Column(Integer, default=0)
    infra_status = Column(String(30), default="VERIFIED") # VERIFIED, UNKNOWN, ESTIMATED

    corridor_links = relationship("CorridorStation", back_populates="station")
    tracks = relationship("Track", back_populates="station")


class CorridorStation(Base):
    __tablename__ = "corridor_stations"

    id = Column(String(60), primary_key=True) # e.g. "CORR-01_BPL"
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    station_code = Column(String(20), ForeignKey("stations.code"))
    km_chainage = Column(Float, nullable=False)
    sequence = Column(Integer, default=1)
    is_major = Column(Boolean, default=False)

    corridor = relationship("Corridor", back_populates="corridor_stations")
    station = relationship("Station", back_populates="corridor_links")


class Section(Base):
    __tablename__ = "sections"

    id = Column(String(50), primary_key=True)
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    from_station_code = Column(String(20), ForeignKey("stations.code"))
    to_station_code = Column(String(20), ForeignKey("stations.code"))
    name = Column(String(100), nullable=False)
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    tracks_count = Column(Integer, default=2) # 1, 2, 3
    block_system = Column(String(50), default="ABSOLUTE_BLOCK")

    corridor = relationship("Corridor", back_populates="sections")
    from_station = relationship("Station", foreign_keys=[from_station_code])
    to_station = relationship("Station", foreign_keys=[to_station_code])
    tracks = relationship("Track", back_populates="section")


class Track(Base):
    __tablename__ = "tracks"

    id = Column(String(50), primary_key=True)
    section_id = Column(String(50), ForeignKey("sections.id"), nullable=True)
    station_code = Column(String(20), ForeignKey("stations.code"), nullable=True)
    name = Column(String(50), nullable=False) # UP_MAIN, DOWN_MAIN, THIRD_LINE, LOOP_1, SIDING_1
    track_type = Column(String(30), default="MAIN") # MAIN, LOOP, SIDING, YARD
    direction = Column(String(20), default="BI_DIRECTIONAL") # UP, DOWN, BI_DIRECTIONAL
    electrified = Column(Boolean, default=True)
    speed_limit_kmph = Column(Integer, default=130)

    section = relationship("Section", back_populates="tracks")
    station = relationship("Station", back_populates="tracks")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(50), primary_key=True)
    corridor_id = Column(String(30), ForeignKey("corridors.id"))
    section_id = Column(String(50), ForeignKey("sections.id"), nullable=True)
    station_code = Column(String(20), ForeignKey("stations.code"), nullable=True)
    track_id = Column(String(50), ForeignKey("tracks.id"), nullable=True)
    department = Column(String(30), nullable=False) # PWAY, TRD, SNT, OPERATIONS
    asset_type = Column(String(50), nullable=False) # RAIL_SECTION, TURNOUT, OHE_MAST, ISOLATOR, TRACK_CIRCUIT, SIGNAL
    km_location = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    health_index = Column(Float, default=95.0) # 0 to 100
    status = Column(String(30), default="OPERATIONAL") # OPERATIONAL, UNDER_OBSERVATION, DEFECTIVE, BLOCKED
