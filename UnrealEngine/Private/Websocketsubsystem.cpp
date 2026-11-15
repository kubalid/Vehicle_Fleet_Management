#include "WebSocketSubsystem.h"

#include "WebSocketsModule.h"
#include "IWebSocket.h"
#include "Modules/ModuleManager.h"

void UWebSocketSubsystem::Deinitialize()
{
	CloseAndReset(1000, TEXT("Subsystem deinitialized"));
	Super::Deinitialize();
}

void UWebSocketSubsystem::Connect(const FString& Url, const FString& Protocol, const TMap<FString, FString>& Headers)
{

	CloseAndReset(1000, TEXT("Reconnecting"));

	if (!FModuleManager::Get().IsModuleLoaded("WebSockets"))
	{
		FModuleManager::Get().LoadModule("WebSockets");
	}

	TArray<FString> Protocols;
	if (!Protocol.IsEmpty())
	{
		Protocols.Add(Protocol);
	}

	Socket = FWebSocketsModule::Get().CreateWebSocket(Url, Protocols, Headers);


	Socket->OnConnected().AddUObject(this, &UWebSocketSubsystem::HandleConnected);
	Socket->OnConnectionError().AddUObject(this, &UWebSocketSubsystem::HandleConnectionError);
	Socket->OnClosed().AddUObject(this, &UWebSocketSubsystem::HandleClosed);
	Socket->OnMessage().AddUObject(this, &UWebSocketSubsystem::HandleMessage);

	UE_LOG(LogTemp, Log, TEXT("WebSocket: connecting to %s"), *Url);
	Socket->Connect();
}

void UWebSocketSubsystem::Disconnect(int32 Code, const FString& Reason)
{
	CloseAndReset(Code, Reason);
}

void UWebSocketSubsystem::SendMessage(const FString& Message)
{
	if (Socket.IsValid() && Socket->IsConnected())
	{
		Socket->Send(Message);
	}
	else
	{
		UE_LOG(LogTemp, Warning, TEXT("WebSocket: SendMessage called while not connected"));
	}
}

bool UWebSocketSubsystem::IsConnected() const
{
	return Socket.IsValid() && Socket->IsConnected();
}

void UWebSocketSubsystem::HandleConnected()
{
	UE_LOG(LogTemp, Log, TEXT("WebSocket: connected"));
	OnConnected.Broadcast();
}

void UWebSocketSubsystem::HandleConnectionError(const FString& Error)
{
	UE_LOG(LogTemp, Warning, TEXT("WebSocket: error: %s"), *Error);
	OnConnectionError.Broadcast(Error);
}

void UWebSocketSubsystem::HandleClosed(int32 StatusCode, const FString& Reason, bool bWasClean)
{
	UE_LOG(LogTemp, Log, TEXT("WebSocket: closed (%d) %s"), StatusCode, *Reason);
	OnClosed.Broadcast(StatusCode, Reason, bWasClean);
}

void UWebSocketSubsystem::HandleMessage(const FString& Message)
{
	OnMessageReceived.Broadcast(Message);
}

void UWebSocketSubsystem::CloseAndReset(int32 Code, const FString& Reason)
{
	if (Socket.IsValid())
	{
		Socket->OnConnected().RemoveAll(this);
		Socket->OnConnectionError().RemoveAll(this);
		Socket->OnClosed().RemoveAll(this);
		Socket->OnMessage().RemoveAll(this);

		if (Socket->IsConnected())
		{
			Socket->Close(Code, Reason);
		}
		Socket.Reset();
	}
}