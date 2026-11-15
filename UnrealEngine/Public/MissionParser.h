// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "MissionParser.generated.h"

/**
 * 
 */
	USTRUCT(BlueprintType)
	struct FVehicleMission
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	int32 Id = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	FString Brand;

	/** Pole "v_type" z JSON-a */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	FString VehicleType;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	FString Status;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	double StartLat = 0.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	double StartLng = 0.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	double DestLat = 0.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	double DestLng = 0.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	FString MissionPurpose;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	double DistanceKm = 0.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	double DurationMin = 0.0;

	/** Punkty trasy. UWAGA: X = longitude, Y = latitude (kolejność jak w JSON/OSRM: [lng, lat]). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
	TArray<FVector2D> RouteCoordinates;
};

UCLASS()
class FLEET_MANAGEMENT_SIM_API UMissionParser : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** Zwraca wartość pola "event" (np. "MISSION_ASSIGNED") albo pusty string, jeśli JSON jest błędny. */
	UFUNCTION(BlueprintPure, Category = "Mission|Parser")
	static FString GetEventName(const FString& Json);

	/** Parsuje wiadomość MISSION_ASSIGNED. Zwraca false, jeśli to inna wiadomość lub JSON jest błędny. */
	UFUNCTION(BlueprintCallable, Category = "Mission|Parser")
	static bool ParseMissionAssigned(const FString& Json, FVehicleMission& OutMission);
};
